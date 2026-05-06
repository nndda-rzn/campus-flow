package repository

import (
	"context"
	"errors"

	"campus-flow/apps/services/notification-service/internal/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotificationNotFound = errors.New("notification not found")

type NotificationRepository struct {
	db *pgxpool.Pool
}

func NewNotificationRepository(db *pgxpool.Pool) *NotificationRepository {
	return &NotificationRepository{
		db: db,
	}
}

func (r *NotificationRepository) CreateNotification(
	ctx context.Context,
	notification model.Notification,
) (*model.Notification, error) {
	var created model.Notification

	err := r.db.QueryRow(ctx, `
		INSERT INTO notifications (
			user_id,
			title,
			message,
			type,
			entity_type,
			entity_id
		)
		VALUES ($1::uuid, $2, $3, $4, $5, NULLIF($6, '')::uuid)
		RETURNING
			id::text,
			user_id::text,
			title,
			message,
			type,
			COALESCE(entity_type, ''),
			COALESCE(entity_id::text, ''),
			is_read,
			created_at,
			read_at
	`, notification.UserID, notification.Title, notification.Message, notification.Type, notification.EntityType, notification.EntityID).Scan(
		&created.ID,
		&created.UserID,
		&created.Title,
		&created.Message,
		&created.Type,
		&created.EntityType,
		&created.EntityID,
		&created.IsRead,
		&created.CreatedAt,
		&created.ReadAt,
	)
	if err != nil {
		return nil, err
	}

	return &created, nil
}

func (r *NotificationRepository) ListByUserID(
	ctx context.Context,
	userID string,
) ([]model.Notification, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			id::text,
			user_id::text,
			title,
			message,
			type,
			COALESCE(entity_type, ''),
			COALESCE(entity_id::text, ''),
			is_read,
			created_at,
			read_at
		FROM notifications
		WHERE user_id = $1::uuid
		ORDER BY created_at DESC
		LIMIT 100
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifications []model.Notification

	for rows.Next() {
		var item model.Notification

		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Title,
			&item.Message,
			&item.Type,
			&item.EntityType,
			&item.EntityID,
			&item.IsRead,
			&item.CreatedAt,
			&item.ReadAt,
		); err != nil {
			return nil, err
		}

		notifications = append(notifications, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return notifications, nil
}

func (r *NotificationRepository) MarkAsRead(
	ctx context.Context,
	notificationID string,
	userID string,
) (*model.Notification, error) {
	var updated model.Notification

	err := r.db.QueryRow(ctx, `
		UPDATE notifications
		SET 
			is_read = TRUE,
			read_at = COALESCE(read_at, NOW())
		WHERE id = $1::uuid
		  AND user_id = $2::uuid
		RETURNING
			id::text,
			user_id::text,
			title,
			message,
			type,
			COALESCE(entity_type, ''),
			COALESCE(entity_id::text, ''),
			is_read,
			created_at,
			read_at
	`, notificationID, userID).Scan(
		&updated.ID,
		&updated.UserID,
		&updated.Title,
		&updated.Message,
		&updated.Type,
		&updated.EntityType,
		&updated.EntityID,
		&updated.IsRead,
		&updated.CreatedAt,
		&updated.ReadAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotificationNotFound
	}

	if err != nil {
		return nil, err
	}

	return &updated, nil
}