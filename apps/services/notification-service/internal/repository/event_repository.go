package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type EventRepository struct {
	db *pgxpool.Pool
}

func NewEventRepository(db *pgxpool.Pool) *EventRepository {
	return &EventRepository{
		db: db,
	}
}

func (r *EventRepository) SaveInboxEvent(
	ctx context.Context,
	eventID string,
	eventType string,
	payload []byte,
) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		INSERT INTO inbox_events (
			event_id,
			event_type,
			payload
		)
		VALUES ($1::uuid, $2, $3::jsonb)
		ON CONFLICT (event_id) DO NOTHING
	`, eventID, eventType, string(payload))
	if err != nil {
		return false, err
	}

	return tag.RowsAffected() > 0, nil
}

func (r *EventRepository) MarkInboxEventProcessed(
	ctx context.Context,
	eventID string,
) error {
	_, err := r.db.Exec(ctx, `
		UPDATE inbox_events
		SET processed_at = NOW()
		WHERE event_id = $1::uuid
	`, eventID)

	return err
}