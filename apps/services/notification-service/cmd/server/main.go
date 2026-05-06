package main

import (
	"context"
	"fmt"
	"log"
	"net"

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

	rabbitConsumer, deliveries, err := messaging.NewRabbitMQConsumer(
		cfg.RabbitMQURL,
		"campusflow.events",
		"q.notification",
		[]string{
			"academic_request.*",
		},
	)
	if err != nil {
		log.Fatalf("failed to connect rabbitmq consumer: %v", err)
	}
	defer rabbitConsumer.Close()

	workerCtx, cancelWorker := context.WithCancel(context.Background())
	defer cancelWorker()

	go worker.StartNotificationConsumer(
		workerCtx,
		deliveries,
		eventRepo,
		notificationService,
	)

	listener, err := net.Listen("tcp", cfg.GRPCPort)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	notificationv1.RegisterNotificationServiceServer(grpcServer, notificationHandler)

	fmt.Println("Notification Service gRPC running on port", cfg.GRPCPort)
	fmt.Println("Notification Service connected to notification_db")
	fmt.Println("Notification Service RabbitMQ consumer started")

	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("failed to serve grpc: %v", err)
	}
}