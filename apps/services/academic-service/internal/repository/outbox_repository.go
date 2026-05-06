package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type OutboxEvent struct {
	ID        string
	EventType string
	Payload   []byte
}

type OutboxRepository struct {
	db *pgxpool.Pool
}

func NewOutboxRepository(db *pgxpool.Pool) *OutboxRepository {
	return &OutboxRepository{
		db: db,
	}
}

func (r *OutboxRepository) FetchPendingEvents(ctx context.Context, limit int) ([]OutboxEvent, error) {
	rows, err := r.db.Query(ctx, `
		SELECT 
			id::text,
			event_type,
			payload::text
		FROM outbox_events
		WHERE status = 'PENDING'
		ORDER BY created_at ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []OutboxEvent

	for rows.Next() {
		var event OutboxEvent
		var payloadText string

		if err := rows.Scan(
			&event.ID,
			&event.EventType,
			&payloadText,
		); err != nil {
			return nil, err
		}

		event.Payload = []byte(payloadText)
		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return events, nil
}

func (r *OutboxRepository) MarkAsPublished(ctx context.Context, eventID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE outbox_events
		SET 
			status = 'PUBLISHED',
			published_at = NOW()
		WHERE id = $1::uuid
	`, eventID)

	return err
}