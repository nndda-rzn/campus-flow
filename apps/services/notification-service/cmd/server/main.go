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

	"campus-flow/apps/services/notification-service/internal/client"
	"campus-flow/apps/services/notification-service/internal/config"
	"campus-flow/apps/services/notification-service/internal/handler"
	"campus-flow/apps/services/notification-service/internal/messaging"
	"campus-flow/apps/services/notification-service/internal/repository"
	"campus-flow/apps/services/notification-service/internal/service"
	"campus-flow/apps/services/notification-service/internal/worker"
	notificationv1 "campus-flow/proto/gen/notification/v1"

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

	notificationRepo := repository.NewNotificationRepository(dbpool)
	notificationService := service.NewNotificationService(notificationRepo)
	notificationHandler := handler.NewNotificationHandler(notificationService)

	eventRepo := repository.NewEventRepository(dbpool)

	authClient, err := client.NewAuthClient(cfg.AuthServiceAddr)
	if err != nil {
		log.Printf("WARNING: failed to dial auth-service at %s: %v", cfg.AuthServiceAddr, err)
		authClient = nil
	} else {
		defer authClient.Close()
	}

	rabbitConsumer, deliveries, err := messaging.NewRabbitMQConsumer(
		cfg.RabbitMQURL,
		"campusflow.events",
		"q.notification",
		[]string{
			"academic_request.*",
			"supervisor_request.*",
		},
	)
	if err != nil {
		log.Fatalf("failed to connect rabbitmq consumer: %v", err)
	}
	defer rabbitConsumer.Close()

	rootCtx, cancelRoot := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancelRoot()

	go worker.StartNotificationConsumer(
		rootCtx,
		deliveries,
		eventRepo,
		notificationService,
		authClient,
	)

	listener, err := net.Listen("tcp", cfg.GRPCPort)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	notificationv1.RegisterNotificationServiceServer(grpcServer, notificationHandler)

	var ready atomic.Bool
	ready.Store(true)
	healthServer := startHealthServer(":50064", dbpool, &ready)
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = healthServer.Shutdown(shutdownCtx)
	}()

	go func() {
		fmt.Println("Notification Service gRPC running on port", cfg.GRPCPort)
		fmt.Println("Notification Service health on :50064")
		fmt.Println("Notification Service RabbitMQ consumer started")
		if err := grpcServer.Serve(listener); err != nil && !errors.Is(err, grpc.ErrServerStopped) {
			log.Fatalf("failed to serve grpc: %v", err)
		}
	}()

	<-rootCtx.Done()
	ready.Store(false)
	log.Println("Notification Service: shutdown signal received, draining...")

	stopped := make(chan struct{})
	go func() {
		grpcServer.GracefulStop()
		close(stopped)
	}()

	select {
	case <-stopped:
		log.Println("Notification Service: gRPC drained cleanly")
	case <-time.After(15 * time.Second):
		log.Println("Notification Service: drain timeout, forcing stop")
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
			log.Printf("notification-service health server: %v", err)
		}
	}()
	return srv
}
