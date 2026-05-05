package main

import (
	"fmt"
	"log"
	"net"

	authv1 "campus-flow/proto/gen/auth/v1"

	"campus-flow/apps/services/auth-service/internal/handler"

	"google.golang.org/grpc"
)

func main() {
	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()

	authHandler := handler.NewAuthHandler()
	authv1.RegisterAuthServiceServer(grpcServer, authHandler)

	fmt.Println("Auth Service gRPC running on port 50051")

	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("failed to serve grpc: %v", err)
	}
}