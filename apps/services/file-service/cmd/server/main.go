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

	"campus-flow/apps/services/file-service/internal/config"
	"campus-flow/apps/services/file-service/internal/handler"
	"campus-flow/apps/services/file-service/internal/messaging"
	"campus-flow/apps/services/file-service/internal/repository"
	"campus-flow/apps/services/file-service/internal/service"
	"campus-flow/apps/services/file-service/internal/worker"
	filev1 "campus-flow/proto/gen/file/v1"

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

	fileRepo := repository.NewFileRepository(dbpool)
	outboxRepo := repository.NewOutboxRepository(dbpool)

	fileService := service.NewFileService(fileRepo, service.ValidationConfig{
		MaxSizeBytes:    cfg.MaxFileSize,
		AllowedMimeType: cfg.AllowedMimeType,
	})
	fileHandler := handler.NewFileHandler(fileService)

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
		fmt.Println("File Service outbox publisher started")
	}

	listener, err := net.Listen("tcp", cfg.GRPCPort)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	filev1.RegisterFileServiceServer(grpcServer, fileHandler)

	var ready atomic.Bool
	ready.Store(true)
	healthServer := startHealthServer(":50063", dbpool, &ready)
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = healthServer.Shutdown(shutdownCtx)
	}()

	go func() {
		fmt.Println("File Service gRPC running on port", cfg.GRPCPort)
		fmt.Println("File Service health on :50063")
		fmt.Printf("File Service mime whitelist: %d entries, max size %d bytes\n",
			len(cfg.AllowedMimeType), cfg.MaxFileSize)
		if err := grpcServer.Serve(listener); err != nil && !errors.Is(err, grpc.ErrServerStopped) {
			log.Fatalf("failed to serve grpc: %v", err)
		}
	}()

	<-rootCtx.Done()
	ready.Store(false)
	log.Println("File Service: shutdown signal received, draining...")

	stopped := make(chan struct{})
	go func() {
		grpcServer.GracefulStop()
		close(stopped)
	}()

	select {
	case <-stopped:
		log.Println("File Service: gRPC drained cleanly")
	case <-time.After(15 * time.Second):
		log.Println("File Service: drain timeout, forcing stop")
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
			log.Printf("file-service health server: %v", err)
		}
	}()
	return srv
}
