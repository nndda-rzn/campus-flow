package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"campus-flow/apps/services/academic-service/internal/config"
	"campus-flow/apps/services/academic-service/internal/handler"
	"campus-flow/apps/services/academic-service/internal/messaging"
	"campus-flow/apps/services/academic-service/internal/repository"
	"campus-flow/apps/services/academic-service/internal/service"
	"campus-flow/apps/services/academic-service/internal/worker"
	academicv1 "campus-flow/proto/gen/academic/v1"

	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
)

func main() {
	cfg := config.Load()

	dbpool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
	defer dbpool.Close()

	if err := dbpool.Ping(context.Background()); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	academicRepo := repository.NewAcademicRepository(dbpool)
	academicService := service.NewAcademicService(academicRepo)
	academicHandler := handler.NewAcademicHandler(academicService)

	// New Student Features Repositories
	thesisRepo := repository.NewThesisRepository(dbpool)
	guidanceLogRepo := repository.NewGuidanceLogRepository(dbpool)
	academicCalendarRepo := repository.NewAcademicCalendarRepository(dbpool)
	faqRepo := repository.NewFAQRepository(dbpool)

	// New Student Features Services
	thesisService := service.NewThesisService(thesisRepo)
	guidanceLogService := service.NewGuidanceLogService(guidanceLogRepo)
	academicCalendarService := service.NewAcademicCalendarService(academicCalendarRepo)
	faqService := service.NewFAQService(faqRepo)

	// New Student Features Handlers
	thesisHandler := handler.NewThesisHandler(thesisService)
	guidanceLogHandler := handler.NewGuidanceLogHandler(guidanceLogService)
	academicCalendarHandler := handler.NewAcademicCalendarHandler(academicCalendarService)
	faqHandler := handler.NewFAQHandler(faqService)

	// Consultation Scheduling
	consultationRepo := repository.NewConsultationRepository(dbpool)
	consultationService := service.NewConsultationService(consultationRepo)
	consultationHandler := handler.NewConsultationHandler(consultationService)

	// Thesis Final Document Review (Tahap 4)
	thesisFinalDocRepo := repository.NewThesisFinalDocumentRepository(dbpool)
	thesisFinalDocService := service.NewThesisFinalDocumentService(thesisFinalDocRepo)
	thesisFinalDocHandler := handler.NewThesisFinalDocumentHandler(thesisFinalDocService)

	// Note Templates (Admin Prodi)
	noteTemplateRepo := repository.NewNoteTemplateRepository(dbpool)
	noteTemplateService := service.NewNoteTemplateService(noteTemplateRepo)
	noteTemplateHandler := handler.NewNoteTemplateHandler(noteTemplateService)

	// Thesis Overview (Admin Prodi)
	thesisOverviewHandler := handler.NewThesisOverviewHandler(thesisService)

	// Composite Handler
	fullAcademicHandler := &compositeHandler{
		AcademicHandler:            academicHandler,
		ThesisHandler:              thesisHandler,
		GuidanceLogHandler:         guidanceLogHandler,
		AcademicCalendarHandler:    academicCalendarHandler,
		FAQHandler:                 faqHandler,
		ConsultationHandler:        consultationHandler,
		ThesisFinalDocumentHandler: thesisFinalDocHandler,
		NoteTemplateHandler:        noteTemplateHandler,
		ThesisOverviewHandler:      thesisOverviewHandler,
	}

	outboxRepo := repository.NewOutboxRepository(dbpool)

	rootCtx, cancelRoot := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancelRoot()

	rabbitPublisher, err := messaging.NewRabbitMQPublisher(cfg.RabbitMQURL, "campusflow.events")
	if err != nil {
		log.Printf("WARNING: failed to connect to RabbitMQ, outbox publisher will not start: %v", err)
	} else {
		defer rabbitPublisher.Close()

		go worker.StartOutboxPublisher(
			rootCtx,
			outboxRepo,
			rabbitPublisher,
			3*time.Second,
		)
		fmt.Println("Academic Service outbox publisher started")
	}

	// Consumer for user.registered events from auth-service so we can auto-stub
	// student/lecturer records in PENDING_BIND state.
	userConsumer, userDeliveries, err := messaging.NewRabbitMQConsumer(
		cfg.RabbitMQURL,
		"campusflow.events",
		"q.academic.users",
		[]string{"user.*"},
		"academic-service-users",
	)
	if err != nil {
		log.Printf("WARNING: failed to start user-registered consumer: %v", err)
	} else {
		defer userConsumer.Close()

		go worker.StartUserRegisteredConsumer(
			rootCtx,
			userDeliveries,
			academicService,
		)
		fmt.Println("Academic Service user-registered consumer started")
	}

	// SLA reminder worker (FR-266) — scans service_requests setiap jam.
	go worker.StartSLAReminderWorker(rootCtx, dbpool, 1*time.Hour)
	fmt.Println("Academic Service SLA reminder worker started (tick=1h)")

	// Lecturer enhancement workers
	go worker.StartConsultationReminderWorker(rootCtx, dbpool, 1*time.Hour)
	fmt.Println("Academic Service Consultation reminder worker started (tick=1h)")

	go worker.StartProgressStuckWorker(rootCtx, dbpool, 24*time.Hour)
	fmt.Println("Academic Service Progress stuck worker started (tick=24h)")

	listener, err := net.Listen("tcp", cfg.GRPCPort)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	academicv1.RegisterAcademicServiceServer(grpcServer, fullAcademicHandler)

	var ready atomic.Bool
	ready.Store(true)
	healthServer := startHealthServer(":50062", dbpool, &ready)
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = healthServer.Shutdown(shutdownCtx)
	}()

	go func() {
		fmt.Println("Academic Service gRPC running on port", cfg.GRPCPort)
		fmt.Println("Academic Service health on :50062")
		if err := grpcServer.Serve(listener); err != nil && !errors.Is(err, grpc.ErrServerStopped) {
			log.Fatalf("failed to serve grpc: %v", err)
		}
	}()

	<-rootCtx.Done()
	ready.Store(false)
	log.Println("Academic Service: shutdown signal received, draining...")

	stopped := make(chan struct{})
	go func() {
		grpcServer.GracefulStop()
		close(stopped)
	}()

	select {
	case <-stopped:
		log.Println("Academic Service: gRPC drained cleanly")
	case <-time.After(15 * time.Second):
		log.Println("Academic Service: drain timeout, forcing stop")
		grpcServer.Stop()
	}
}

func startHealthServer(addr string, db *pgxpool.Pool, ready *atomic.Bool) *http.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/readyz", func(w http.ResponseWriter, r *http.Request) {
		if !ready.Load() {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte("draining"))
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 1*time.Second)
		defer cancel()
		if err := db.Ping(ctx); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte("db unhealthy"))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ready"))
	})
	srv := &http.Server{Addr: addr, Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("academic-service health server: %v", err)
		}
	}()
	return srv
}

type compositeHandler struct {
	*handler.AcademicHandler
	*handler.ThesisHandler
	*handler.GuidanceLogHandler
	*handler.AcademicCalendarHandler
	*handler.FAQHandler
	*handler.ConsultationHandler
	*handler.ThesisFinalDocumentHandler
	*handler.NoteTemplateHandler
	*handler.ThesisOverviewHandler
}
