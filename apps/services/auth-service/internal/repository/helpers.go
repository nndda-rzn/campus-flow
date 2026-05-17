package repository

import (
	"context"
	"encoding/json"
	"strconv"

	"github.com/jackc/pgx/v5/pgconn"
)

// txExecutor narrows the surface so helpers work with both pgxpool and tx.
type txExecutor interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// writeAuditLogTx writes an audit log row inside the given transaction.
func writeAuditLogTx(
	ctx context.Context,
	tx txExecutor,
	actorUserID string,
	action string,
	entityType string,
	entityID string,
	metadata map[string]string,
) error {
	metaJSON, err := json.Marshal(metadata)
	if err != nil {
		return err
	}

	if actorUserID == "" {
		_, err = tx.Exec(ctx, `
			INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
			VALUES (NULL, $1, $2, $3::uuid, $4::jsonb)
		`, action, entityType, entityID, string(metaJSON))
		return err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
		VALUES ($1::uuid, $2, $3, $4::uuid, $5::jsonb)
	`, actorUserID, action, entityType, entityID, string(metaJSON))
	return err
}

// writeOutboxTx writes an outbox event row inside the given transaction.
func writeOutboxTx(
	ctx context.Context,
	tx txExecutor,
	aggregateID string,
	eventType string,
	payload map[string]string,
) error {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO outbox_events (aggregate_id, aggregate_type, event_type, payload)
		VALUES ($1::uuid, 'users', $2, $3::jsonb)
	`, aggregateID, eventType, string(payloadJSON))
	return err
}

// itoa is a tiny helper for inline placeholder building.
func itoa(i int) string {
	return strconv.Itoa(i)
}
