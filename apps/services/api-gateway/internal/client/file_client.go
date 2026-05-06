package client

import (
	"log"

	filev1 "campus-flow/proto/gen/file/v1"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type FileClient struct {
	conn   *grpc.ClientConn
	Client filev1.FileServiceClient
}

func NewFileClient(address string) *FileClient {
	conn, err := grpc.NewClient(
		address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("failed to connect to file-service: %v", err)
	}

	return &FileClient{
		conn:   conn,
		Client: filev1.NewFileServiceClient(conn),
	}
}

func (c *FileClient) Close() error {
	return c.conn.Close()
}