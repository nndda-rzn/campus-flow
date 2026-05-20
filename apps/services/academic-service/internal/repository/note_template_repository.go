package repository

import (
	"context"
	"errors"

	"campus-flow/apps/services/academic-service/internal/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNoteTemplateNotFound = errors.New("note template not found")
)

type NoteTemplateRepository struct {
	db *pgxpool.Pool
}

func NewNoteTemplateRepository(db *pgxpool.Pool) *NoteTemplateRepository {
	return &NoteTemplateRepository{db: db}
}

func (r *NoteTemplateRepository) List(ctx context.Context, departmentID, category string) ([]model.NoteTemplate, error) {
	query := `SELECT id, department_id, category, title, body, usage_count, is_active, created_by_user_id, created_at, updated_at
		FROM note_templates WHERE is_active = true`
	args := []interface{}{}
	argIdx := 1

	if departmentID != "" {
		query += ` AND department_id = $` + itoa(argIdx)
		args = append(args, departmentID)
		argIdx++
	}
	if category != "" {
		query += ` AND category = $` + itoa(argIdx)
		args = append(args, category)
		argIdx++
	}

	query += ` ORDER BY usage_count DESC, title ASC`

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []model.NoteTemplate
	for rows.Next() {
		var t model.NoteTemplate
		if err := rows.Scan(&t.ID, &t.DepartmentID, &t.Category, &t.Title, &t.Body, &t.UsageCount, &t.IsActive, &t.CreatedByUserID, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	return templates, rows.Err()
}

func (r *NoteTemplateRepository) GetByID(ctx context.Context, id string) (*model.NoteTemplate, error) {
	query := `SELECT id, department_id, category, title, body, usage_count, is_active, created_by_user_id, created_at, updated_at
		FROM note_templates WHERE id = $1`

	var t model.NoteTemplate
	err := r.db.QueryRow(ctx, query, id).Scan(&t.ID, &t.DepartmentID, &t.Category, &t.Title, &t.Body, &t.UsageCount, &t.IsActive, &t.CreatedByUserID, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNoteTemplateNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *NoteTemplateRepository) Create(ctx context.Context, t *model.NoteTemplate) (*model.NoteTemplate, error) {
	query := `INSERT INTO note_templates (department_id, category, title, body, created_by_user_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, department_id, category, title, body, usage_count, is_active, created_by_user_id, created_at, updated_at`

	var created model.NoteTemplate
	err := r.db.QueryRow(ctx, query, t.DepartmentID, t.Category, t.Title, t.Body, t.CreatedByUserID).Scan(
		&created.ID, &created.DepartmentID, &created.Category, &created.Title, &created.Body,
		&created.UsageCount, &created.IsActive, &created.CreatedByUserID, &created.CreatedAt, &created.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

func (r *NoteTemplateRepository) Update(ctx context.Context, id, title, body, category string) (*model.NoteTemplate, error) {
	query := `UPDATE note_templates SET title = $2, body = $3, category = $4, updated_at = NOW()
		WHERE id = $1 AND is_active = true
		RETURNING id, department_id, category, title, body, usage_count, is_active, created_by_user_id, created_at, updated_at`

	var t model.NoteTemplate
	err := r.db.QueryRow(ctx, query, id, title, body, category).Scan(
		&t.ID, &t.DepartmentID, &t.Category, &t.Title, &t.Body,
		&t.UsageCount, &t.IsActive, &t.CreatedByUserID, &t.CreatedAt, &t.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNoteTemplateNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *NoteTemplateRepository) Delete(ctx context.Context, id string) error {
	query := `UPDATE note_templates SET is_active = false, updated_at = NOW() WHERE id = $1 AND is_active = true`
	tag, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNoteTemplateNotFound
	}
	return nil
}

func (r *NoteTemplateRepository) IncrementUsage(ctx context.Context, id string) (*model.NoteTemplate, error) {
	query := `UPDATE note_templates SET usage_count = usage_count + 1, updated_at = NOW()
		WHERE id = $1 AND is_active = true
		RETURNING id, department_id, category, title, body, usage_count, is_active, created_by_user_id, created_at, updated_at`

	var t model.NoteTemplate
	err := r.db.QueryRow(ctx, query, id).Scan(
		&t.ID, &t.DepartmentID, &t.Category, &t.Title, &t.Body,
		&t.UsageCount, &t.IsActive, &t.CreatedByUserID, &t.CreatedAt, &t.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNoteTemplateNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

