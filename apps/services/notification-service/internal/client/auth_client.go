package client

import (
	"context"
	"log"
	"time"

	authv1 "campus-flow/proto/gen/auth/v1"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// AuthClient is a thin wrapper for talking to auth-service from inside
// notification-service. We only need ListUsersByRole at the moment to
// support multi-recipient broadcasts (FR-130).
type AuthClient struct {
	conn   *grpc.ClientConn
	client authv1.AuthServiceClient
}

func NewAuthClient(address string) (*AuthClient, error) {
	conn, err := grpc.NewClient(
		address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, err
	}
	return &AuthClient{
		conn:   conn,
		client: authv1.NewAuthServiceClient(conn),
	}, nil
}

func (c *AuthClient) Close() error {
	if c.conn == nil {
		return nil
	}
	return c.conn.Close()
}

// ListUserIDsByRole returns active user IDs that belong to the given role.
// Returns empty slice on any error to keep the consumer working when auth
// is unreachable — multi-recipient broadcast degrades to single-recipient
// gracefully.
func (c *AuthClient) ListUserIDsByRole(ctx context.Context, role string) []string {
	if c == nil || c.client == nil {
		return nil
	}

	callCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	res, err := c.client.ListUsersByRole(callCtx, &authv1.ListUsersByRoleRequest{
		Role: role,
	})
	if err != nil {
		log.Printf("notification: ListUsersByRole(%s) failed: %v", role, err)
		return nil
	}

	ids := make([]string, 0, len(res.Users))
	for _, u := range res.Users {
		if u.Id != "" {
			ids = append(ids, u.Id)
		}
	}
	return ids
}
