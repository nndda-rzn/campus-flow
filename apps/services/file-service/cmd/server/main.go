package main

import (
	"context"
	"fmt"
	"log"
	"net"
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

	rabbitPublisher, err := messaging.NewRabbitMQPublisher(cfg.RabbitMQURL, "campusflow.events")
	if err != nil {
		log.Printf("WARNING: failed to connect to RabbitMQ, outbox publisher will not start: %v", err)
	} else {
		defer rabbitPublisher.Close()

		workerCtx, cancelWorker := context.WithCancel(context.Background())
		defer cancelWorker()

		go worker.StartOutboxPublisher(
			workerCtx,
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

	fmt.Println("File Service gRPC running on port", cfg.GRPCPort)
	fmt.Println("File Service connected to file_db")
	fmt.Printf("File Service mime whitelist: %d entries, max size %d bytes\n",
		len(cfg.AllowedMimeType), cfg.MaxFileSize)

	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("failed to serve grpc: %v", err)
	}
}
