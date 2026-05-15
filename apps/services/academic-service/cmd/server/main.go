package main

import (
	"context"
	"fmt"
	"log"
	"net"
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

	outboxRepo := repository.NewOutboxRepository(dbpool)

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
		fmt.Println("Academic Service outbox publisher started")
	}

	listener, err := net.Listen("tcp", cfg.GRPCPort)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	academicv1.RegisterAcademicServiceServer(grpcServer, academicHandler)

	fmt.Println("Academic Service gRPC running on port", cfg.GRPCPort)
	fmt.Println("Academic Service connected to academic_db")

	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("failed to serve grpc: %v", err)
	}
}
