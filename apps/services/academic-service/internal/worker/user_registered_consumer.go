package worker

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"campus-flow/apps/services/academic-service/internal/service"

	amqp "github.com/rabbitmq/amqp091-go"
)

// UserRegisteredPayload mirrors the auth-service outbox payload for
// user.registered events.
type UserRegisteredPayload struct {
	UserID   string `json:"user_id"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

// StartUserRegisteredConsumer subscribes to user.* events and auto-stubs a
// student/lecturer record in the directory when applicable.
func StartUserRegisteredConsumer(
	ctx context.Context,
	deliveries <-chan amqp.Delivery,
	academicService *service.AcademicService,
) {
	log.Println("Academic user-registered consumer started")

	for {
		select {
		case <-ctx.Done():
			log.Println("Academic user-registered consumer stopped")
			return

		case delivery, ok := <-deliveries:
			if !ok {
				log.Println("Academic user-registered delivery channel closed")
				return
			}

			handleUserDelivery(ctx, delivery, academicService)
		}
	}
}

func handleUserDelivery(
	ctx context.Context,
	delivery amqp.Delivery,
	academicService *service.AcademicService,
) {
	eventType := delivery.RoutingKey

	if eventType != "user.registered" {
		// Currently only auto-stub on registration. Other user.* events are
		// acknowledged to keep the queue moving.
		_ = delivery.Ack(false)
		return
	}

	var payload UserRegisteredPayload
	if err := json.Unmarshal(delivery.Body, &payload); err != nil {
		log.Printf("academic: failed to unmarshal user.registered payload: %v", err)
		_ = delivery.Nack(false, false)
		return
	}

	processCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := academicService.AutoStubFromUserRegistered(
		processCtx,
		payload.UserID,
		payload.FullName,
		payload.Email,
		payload.Role,
	); err != nil {
		log.Printf("academic: failed to auto-stub user %s: %v", payload.UserID, err)
		_ = delivery.Nack(false, true)
		return
	}

	_ = delivery.Ack(false)
	log.Printf("academic: auto-stubbed user %s (role=%s)", payload.UserID, payload.Role)
}
