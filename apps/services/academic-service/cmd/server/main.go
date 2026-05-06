package main

import (
	"context"
	"fmt"
	"log"
	"net"

	"campus-flow/apps/services/academic-service/internal/config"
	"campus-flow/apps/services/academic-service/internal/handler"
	"campus-flow/apps/services/academic-service/internal/repository"
	"campus-flow/apps/services/academic-service/internal/service"
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