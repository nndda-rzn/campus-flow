package worker

import (
	"context"
	"log"
	"time"

	"campus-flow/apps/services/file-service/internal/messaging"
	"campus-flow/apps/services/file-service/internal/repository"
)

func StartOutboxPublisher(
	ctx context.Context,
	outboxRepo *repository.OutboxRepository,
	publisher *messaging.RabbitMQPublisher,
	interval time.Duration,
) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Println("File outbox publisher started")

	for {
		select {
		case <-ctx.Done():
			log.Println("File outbox publisher stopped")
			return
		case <-ticker.C:
			publishPendingEvents(ctx, outboxRepo, publisher)
		}
	}
}

func publishPendingEvents(
	ctx context.Context,
	outboxRepo *repository.OutboxRepository,
	publisher *messaging.RabbitMQPublisher,
) {
	events, err := outboxRepo.FetchPendingEvents(ctx, 20)
	if err != nil {
		log.Printf("file: failed to fetch pending outbox events: %v", err)
		return
	}

	for _, event := range events {
		publishCtx, cancel := context.WithTimeout(ctx, 5*time.Second)

		err := publisher.Publish(
			publishCtx,
			event.EventType,
			event.ID,
			event.Payload,
		)

		cancel()

		if err != nil {
			log.Printf("file: failed to publish event %s: %v", event.ID, err)
			continue
		}

		if err := outboxRepo.MarkAsPublished(ctx, event.ID); err != nil {
			log.Printf("file: failed to mark event %s as published: %v", event.ID, err)
			continue
		}

		log.Printf("file: published event %s with routing key %s", event.ID, event.EventType)
	}
}
