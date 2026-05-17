package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"campus-flow/apps/services/auth-service/internal/config"
	"campus-flow/apps/services/auth-service/internal/handler"
	"campus-flow/apps/services/auth-service/internal/messaging"
	"campus-flow/apps/services/auth-service/internal/repository"
	"campus-flow/apps/services/auth-service/internal/service"
	"campus-flow/apps/services/auth-service/internal/worker"
	authv1 "campus-flow/proto/gen/auth/v1"

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

	userRepo := repository.NewUserRepository(dbpool)
	tokenRepo := repository.NewTokenRepository(dbpool)
	outboxRepo := repository.NewOutboxRepository(dbpool)

	authService := service.NewAuthService(
		userRepo,
		tokenRepo,
		cfg.JWTSecret,
		cfg.AccessTokenTTL,
		cfg.RefreshTokenTTL,
	)

	authHandler := handler.NewAuthHandler(authService)

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
		fmt.Println("Auth Service outbox publisher started")
	}

	listener, err := net.Listen("tcp", cfg.GRPCPort)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	authv1.RegisterAuthServiceServer(grpcServer, authHandler)

	// Health check HTTP server (Kubernetes / docker-compose ready).
	var ready atomic.Bool
	ready.Store(true)
	healthServer := startHealthServer(":50061", dbpool, &ready)
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = healthServer.Shutdown(shutdownCtx)
	}()

	go func() {
		fmt.Println("Auth Service gRPC running on port", cfg.GRPCPort)
		fmt.Println("Auth Service health on :50061")
		if err := grpcServer.Serve(listener); err != nil && !errors.Is(err, grpc.ErrServerStopped) {
			log.Fatalf("failed to serve grpc: %v", err)
		}
	}()

	<-rootCtx.Done()
	ready.Store(false)
	log.Println("Auth Service: shutdown signal received, draining...")

	stopped := make(chan struct{})
	go func() {
		grpcServer.GracefulStop()
		close(stopped)
	}()

	select {
	case <-stopped:
		log.Println("Auth Service: gRPC drained cleanly")
	case <-time.After(15 * time.Second):
		log.Println("Auth Service: drain timeout, forcing stop")
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

	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("auth-service health server: %v", err)
		}
	}()
	_ = os.Getpid() // suppress unused if needed
	return srv
}