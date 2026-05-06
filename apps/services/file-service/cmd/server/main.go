package main

import (
	"context"
	"fmt"
	"log"
	"net"

	"campus-flow/apps/services/file-service/internal/config"
	"campus-flow/apps/services/file-service/internal/handler"
	"campus-flow/apps/services/file-service/internal/repository"
	"campus-flow/apps/services/file-service/internal/service"
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
	fileService := service.NewFileService(fileRepo)
	fileHandler := handler.NewFileHandler(fileService)

	listener, err := net.Listen("tcp", cfg.GRPCPort)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	filev1.RegisterFileServiceServer(grpcServer, fileHandler)

	fmt.Println("File Service gRPC running on port", cfg.GRPCPort)
	fmt.Println("File Service connected to file_db")

	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("failed to serve grpc: %v", err)
	}
}