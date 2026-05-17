package repository

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/academic-service/internal/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrAcademicYearNotFound = errors.New("academic year not found")

type AcademicYearRepository struct {
	db *pgxpool.Pool
}

func NewAcademicYearRepository(db *pgxpool.Pool) *AcademicYearRepository {
	return &AcademicYearRepository{db: db}
}

func (r *AcademicYearRepository) List(ctx context.Context) ([]model.AcademicYear, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id::text, code, name, start_date, end_date, is_active, created_at, updated_at
		FROM academic_years
		ORDER BY start_date DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.AcademicYear
	for rows.Next() {
		var y model.AcademicYear
		if err := rows.Scan(
			&y.ID, &y.Code, &y.Name, &y.StartDate, &y.EndDate,
			&y.IsActive, &y.CreatedAt, &y.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, y)
	}
	return items, rows.Err()
}

// GetActive returns the academic year currently flagged is_active.
// Returns ErrAcademicYearNotFound if none is set.
func (r *AcademicYearRepository) GetActive(ctx context.Context) (*model.AcademicYear, error) {
	var y model.AcademicYear
	err := r.db.QueryRow(ctx, `
		SELECT id::text, code, name, start_date, end_date, is_active, created_at, updated_at
		FROM academic_years
		WHERE is_active = TRUE
		LIMIT 1
	`).Scan(
		&y.ID, &y.Code, &y.Name, &y.StartDate, &y.EndDate,
		&y.IsActive, &y.CreatedAt, &y.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrAcademicYearNotFound
	}
	if err != nil {
		return nil, err
	}
	return &y, nil
}

func (r *AcademicYearRepository) Create(
	ctx context.Context,
	code, name, startDate, endDate string,
	isActive bool,
) (*model.AcademicYear, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	name = strings.TrimSpace(name)

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if isActive {
		// Demote any currently-active row first to honor the partial unique
		// index (only one row may be active at a time).
		if _, err := tx.Exec(ctx, `
			UPDATE academic_years SET is_active = FALSE, updated_at = NOW()
			WHERE is_active = TRUE
		`); err != nil {
			return nil, err
		}
	}

	var id string
	err = tx.QueryRow(ctx, `
		INSERT INTO academic_years (code, name, start_date, end_date, is_active)
		VALUES ($1, $2, $3::date, $4::date, $5)
		RETURNING id::text
	`, code, name, startDate, endDate, isActive).Scan(&id)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, id)
}

func (r *AcademicYearRepository) SetActive(ctx context.Context, id string) (*model.AcademicYear, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		UPDATE academic_years SET is_active = FALSE, updated_at = NOW()
		WHERE is_active = TRUE
	`); err != nil {
		return nil, err
	}

	cmd, err := tx.Exec(ctx, `
		UPDATE academic_years SET is_active = TRUE, updated_at = NOW()
		WHERE id = $1::uuid
	`, id)
	if err != nil {
		return nil, err
	}
	if cmd.RowsAffected() == 0 {
		return nil, ErrAcademicYearNotFound
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, id)
}

func (r *AcademicYearRepository) Get(ctx context.Context, id string) (*model.AcademicYear, error) {
	var y model.AcademicYear
	err := r.db.QueryRow(ctx, `
		SELECT id::text, code, name, start_date, end_date, is_active, created_at, updated_at
		FROM academic_years
		WHERE id = $1::uuid
		LIMIT 1
	`, id).Scan(
		&y.ID, &y.Code, &y.Name, &y.StartDate, &y.EndDate,
		&y.IsActive, &y.CreatedAt, &y.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrAcademicYearNotFound
	}
	if err != nil {
		return nil, err
	}
	return &y, nil
}
