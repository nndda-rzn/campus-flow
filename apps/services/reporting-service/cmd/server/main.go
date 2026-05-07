package main

import (
	"context"
	"fmt"
	"log"
	"net"

	"campus-flow/apps/services/reporting-service/internal/config"
	"campus-flow/apps/services/reporting-service/internal/handler"
	"campus-flow/apps/services/reporting-service/internal/messaging"
	"campus-flow/apps/services/reporting-service/internal/repository"
	"campus-flow/apps/services/reporting-service/internal/service"
	"campus-flow/apps/services/reporting-service/internal/worker"
	reportingv1 "campus-flow/proto/gen/reporting/v1"

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

	reportingRepo := repository.NewReportingRepository(dbpool)
	reportingService := service.NewReportingService(reportingRepo)
	reportingHandler := handler.NewReportingHandler(reportingService)

	rabbitConsumer, deliveries, err := messaging.NewRabbitMQConsumer(
		cfg.RabbitMQURL,
		"campusflow.events",
		"q.reporting",
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

	go worker.StartReportingConsumer(
		workerCtx,
		deliveries,
		reportingRepo,
	)

	listener, err := net.Listen("tcp", cfg.GRPCPort)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	reportingv1.RegisterReportingServiceServer(grpcServer, reportingHandler)

	fmt.Println("Reporting Service gRPC running on port", cfg.GRPCPort)
	fmt.Println("Reporting Service connected to reporting_db")

	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("failed to serve grpc: %v", err)
	}
}