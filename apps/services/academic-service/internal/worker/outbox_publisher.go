package worker

import (
	"context"
	"log"
	"time"

	"campus-flow/apps/services/academic-service/internal/messaging"
	"campus-flow/apps/services/academic-service/internal/repository"
)

func StartOutboxPublisher(
	ctx context.Context,
	outboxRepo *repository.OutboxRepository,
	publisher *messaging.RabbitMQPublisher,
	interval time.Duration,
) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Println("Academic outbox publisher started")

	for {
		select {
		case <-ctx.Done():
			log.Println("Academic outbox publisher stopped")
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
		log.Printf("failed to fetch pending outbox events: %v", err)
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
			log.Printf("failed to publish event %s: %v", event.ID, err)
			continue
		}

		if err := outboxRepo.MarkAsPublished(ctx, event.ID); err != nil {
			log.Printf("failed to mark event %s as published: %v", event.ID, err)
			continue
		}

		log.Printf("published event %s with routing key %s", event.ID, event.EventType)
	}
}