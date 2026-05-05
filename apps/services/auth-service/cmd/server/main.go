package main

import (
	"context"
	"fmt"
	"log"
	"net"

	"campus-flow/apps/services/auth-service/internal/config"
	"campus-flow/apps/services/auth-service/internal/handler"
	"campus-flow/apps/services/auth-service/internal/repository"
	"campus-flow/apps/services/auth-service/internal/service"
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
	authService := service.NewAuthService(userRepo)
	authHandler := handler.NewAuthHandler(authService)

	listener, err := net.Listen("tcp", cfg.GRPCPort)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	authv1.RegisterAuthServiceServer(grpcServer, authHandler)

	fmt.Println("Auth Service gRPC running on port", cfg.GRPCPort)
	fmt.Println("Auth Service connected to auth_db")

	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("failed to serve grpc: %v", err)
	}
}