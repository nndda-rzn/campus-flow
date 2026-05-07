package worker

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"campus-flow/apps/services/reporting-service/internal/model"
	"campus-flow/apps/services/reporting-service/internal/repository"

	amqp "github.com/rabbitmq/amqp091-go"
)

type AcademicRequestEventPayload struct {
	RequestID     string `json:"request_id"`
	RequestNumber string `json:"request_number"`
	StudentUserID string `json:"student_user_id"`
	OldStatus     string `json:"old_status"`
	Status        string `json:"status"`
	ServiceCode   string `json:"service_code"`
	ServiceName   string `json:"service_name"`
	Title         string `json:"title"`
	ActorUserID   string `json:"actor_user_id"`
	ActorRole     string `json:"actor_role"`
	Note          string `json:"note"`
}

func StartReportingConsumer(
	ctx context.Context,
	deliveries <-chan amqp.Delivery,
	repo *repository.ReportingRepository,
) {
	log.Println("Reporting consumer started")

	for {
		select {
		case <-ctx.Done():
			log.Println("Reporting consumer stopped")
			return

		case delivery, ok := <-deliveries:
			if !ok {
				log.Println("Reporting delivery channel closed")
				return
			}

			handleDelivery(ctx, delivery, repo)
		}
	}
}

func handleDelivery(
	ctx context.Context,
	delivery amqp.Delivery,
	repo *repository.ReportingRepository,
) {
	eventID := delivery.MessageId
	eventType := delivery.RoutingKey

	if eventID == "" {
		log.Println("reporting event ignored: missing message id")
		_ = delivery.Nack(false, false)
		return
	}

	processCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	inserted, err := repo.SaveInboxEvent(
		processCtx,
		eventID,
		eventType,
		delivery.Body,
	)
	if err != nil {
		log.Printf("failed to save reporting inbox event %s: %v", eventID, err)
		_ = delivery.Nack(false, true)
		return
	}

	if !inserted {
		log.Printf("duplicate reporting event ignored: %s", eventID)
		_ = delivery.Ack(false)
		return
	}

	if err := projectAcademicRequestEvent(processCtx, repo, eventID, eventType, delivery.Body); err != nil {
		log.Printf("failed to project reporting event %s: %v", eventID, err)
		_ = delivery.Nack(false, false)
		return
	}

	if err := repo.MarkInboxEventProcessed(processCtx, eventID); err != nil {
		log.Printf("failed to mark reporting inbox processed %s: %v", eventID, err)
		_ = delivery.Nack(false, true)
		return
	}

	_ = delivery.Ack(false)
	log.Printf("reporting event projected: %s", eventType)
}

func projectAcademicRequestEvent(
	ctx context.Context,
	repo *repository.ReportingRepository,
	eventID string,
	eventType string,
	body []byte,
) error {
	var payload AcademicRequestEventPayload

	if err := json.Unmarshal(body, &payload); err != nil {
		return err
	}

	if payload.RequestID == "" || payload.StudentUserID == "" {
		log.Printf("reporting event ignored because payload is incomplete: %s", eventType)
		return nil
	}

	status := payload.Status
	if status == "" {
		status = statusFromEventType(eventType)
	}

	snapshot := model.AcademicRequestSnapshot{
		RequestID:       payload.RequestID,
		RequestNumber:   payload.RequestNumber,
		StudentUserID:   payload.StudentUserID,
		ServiceCode:     payload.ServiceCode,
		ServiceName:     payload.ServiceName,
		Title:           payload.Title,
		Status:          status,
		SourceEventID:   eventID,
		SourceEventType: eventType,
	}

	return repo.UpsertAcademicRequestSnapshot(ctx, snapshot)
}

func statusFromEventType(eventType string) string {
	switch eventType {
	case "academic_request.created":
		return "SUBMITTED"
	case "academic_request.verified":
		return "VERIFIED"
	case "academic_request.approved":
		return "APPROVED"
	case "academic_request.rejected":
		return "REJECTED"
	case "academic_request.completed":
		return "COMPLETED"
	default:
		return "UNKNOWN"
	}
}