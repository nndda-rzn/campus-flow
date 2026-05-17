package repository

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/academic-service/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrInvalidCommentType = errors.New("invalid comment request type")

type CommentRepository struct {
	db *pgxpool.Pool
}

func NewCommentRepository(db *pgxpool.Pool) *CommentRepository {
	return &CommentRepository{db: db}
}

func (r *CommentRepository) List(
	ctx context.Context,
	requestType string,
	requestID string,
) ([]model.RequestComment, error) {
	requestType = normalizeCommentType(requestType)
	if requestType == "" {
		return nil, ErrInvalidCommentType
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			id::text,
			request_id::text,
			request_type,
			author_user_id::text,
			author_name,
			author_role,
			body,
			created_at
		FROM request_comments
		WHERE request_type = $1 AND request_id = $2::uuid
		ORDER BY created_at ASC
	`, requestType, requestID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.RequestComment
	for rows.Next() {
		var c model.RequestComment
		if err := rows.Scan(
			&c.ID, &c.RequestID, &c.RequestType,
			&c.AuthorUserID, &c.AuthorName, &c.AuthorRole,
			&c.Body, &c.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	return items, rows.Err()
}

func (r *CommentRepository) Create(
	ctx context.Context,
	c model.RequestComment,
) (*model.RequestComment, error) {
	c.RequestType = normalizeCommentType(c.RequestType)
	if c.RequestType == "" {
		return nil, ErrInvalidCommentType
	}

	var id string
	err := r.db.QueryRow(ctx, `
		INSERT INTO request_comments (
			request_id, request_type, author_user_id,
			author_name, author_role, body
		)
		VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6)
		RETURNING id::text
	`, c.RequestID, c.RequestType, c.AuthorUserID,
		c.AuthorName, c.AuthorRole, c.Body).Scan(&id)
	if err != nil {
		return nil, err
	}

	c.ID = id
	// Refetch to get authoritative timestamps.
	items, err := r.List(ctx, c.RequestType, c.RequestID)
	if err != nil {
		return nil, err
	}
	for _, it := range items {
		if it.ID == id {
			return &it, nil
		}
	}
	return &c, nil
}

func normalizeCommentType(t string) string {
	t = strings.ToUpper(strings.TrimSpace(t))
	if t == "ACADEMIC" || t == "SUPERVISOR" {
		return t
	}
	return ""
}
