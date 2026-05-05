package client

import (
	"log"

	authv1 "campus-flow/proto/gen/auth/v1"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type AuthClient struct {
	conn   *grpc.ClientConn
	Client authv1.AuthServiceClient
}

func NewAuthClient(address string) *AuthClient {
	conn, err := grpc.NewClient(
		address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("failed to connect to auth-service: %v", err)
	}

	return &AuthClient{
		conn:   conn,
		Client: authv1.NewAuthServiceClient(conn),
	}
}

func (c *AuthClient) Close() error {
	return c.conn.Close()
}