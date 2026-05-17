package repository

import (
	"context"
	"strings"
)

type AuditLogItem struct {
	ID            string
	ActorUserID   string
	Action        string
	EntityType    string
	EntityID      string
	MetadataJSON  string
	CreatedAt     string
}

func (r *UserRepository) ListAuditLogs(
	ctx context.Context,
	actorUserID string,
	action string,
	entityType string,
	limit int,
) ([]AuditLogItem, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}

	args := []interface{}{}
	conds := []string{}

	if actorUserID = strings.TrimSpace(actorUserID); actorUserID != "" {
		args = append(args, actorUserID)
		conds = append(conds, "actor_user_id = $"+itoa(len(args))+"::uuid")
	}
	if action = strings.TrimSpace(action); action != "" {
		args = append(args, strings.ToUpper(action))
		conds = append(conds, "action = $"+itoa(len(args)))
	}
	if entityType = strings.TrimSpace(entityType); entityType != "" {
		args = append(args, entityType)
		conds = append(conds, "entity_type = $"+itoa(len(args)))
	}

	query := `
		SELECT
			id::text,
			COALESCE(actor_user_id::text, ''),
			action,
			entity_type,
			COALESCE(entity_id::text, ''),
			metadata::text,
			to_char(created_at, 'YYYY-MM-DD HH24:MI:SS')
		FROM audit_logs
	`
	if len(conds) > 0 {
		query += " WHERE " + strings.Join(conds, " AND ")
	}
	args = append(args, limit)
	query += " ORDER BY created_at DESC LIMIT $" + itoa(len(args))

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []AuditLogItem
	for rows.Next() {
		var it AuditLogItem
		if err := rows.Scan(
			&it.ID, &it.ActorUserID, &it.Action,
			&it.EntityType, &it.EntityID, &it.MetadataJSON, &it.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}
