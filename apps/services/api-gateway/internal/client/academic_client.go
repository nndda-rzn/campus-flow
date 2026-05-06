package client

import (
	"log"

	academicv1 "campus-flow/proto/gen/academic/v1"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type AcademicClient struct {
	conn   *grpc.ClientConn
	Client academicv1.AcademicServiceClient
}

func NewAcademicClient(address string) *AcademicClient {
	conn, err := grpc.NewClient(
		address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("failed to connect to academic-service: %v", err)
	}

	return &AcademicClient{
		conn:   conn,
		Client: academicv1.NewAcademicServiceClient(conn),
	}
}

func (c *AcademicClient) Close() error {
	return c.conn.Close()
}