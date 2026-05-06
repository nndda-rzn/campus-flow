package client

import (
	"log"

	notificationv1 "campus-flow/proto/gen/notification/v1"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type NotificationClient struct {
	conn   *grpc.ClientConn
	Client notificationv1.NotificationServiceClient
}

func NewNotificationClient(address string) *NotificationClient {
	conn, err := grpc.NewClient(
		address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("failed to connect to notification-service: %v", err)
	}

	return &NotificationClient{
		conn:   conn,
		Client: notificationv1.NewNotificationServiceClient(conn),
	}
}

func (c *NotificationClient) Close() error {
	return c.conn.Close()
}