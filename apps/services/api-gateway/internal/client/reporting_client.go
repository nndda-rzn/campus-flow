package client

import (
	"log"

	reportingv1 "campus-flow/proto/gen/reporting/v1"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type ReportingClient struct {
	conn   *grpc.ClientConn
	Client reportingv1.ReportingServiceClient
}

func NewReportingClient(address string) *ReportingClient {
	conn, err := grpc.NewClient(
		address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("failed to connect to reporting-service: %v", err)
	}

	return &ReportingClient{
		conn:   conn,
		Client: reportingv1.NewReportingServiceClient(conn),
	}
}

func (c *ReportingClient) Close() error {
	return c.conn.Close()
}