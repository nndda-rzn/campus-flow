package repository

import (
	"context"
	"strings"

	"campus-flow/apps/services/academic-service/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ScopeRepository struct {
	db *pgxpool.Pool
}

func NewScopeRepository(db *pgxpool.Pool) *ScopeRepository {
	return &ScopeRepository{db: db}
}

// ListByUserID returns all departments scoped to the given user.
func (r *ScopeRepository) ListByUserID(ctx context.Context, userID string) ([]model.UserDepartmentScope, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			s.user_id::text,
			s.department_id::text,
			d.name,
			d.code,
			s.created_at
		FROM user_department_scopes s
		JOIN departments d ON d.id = s.department_id
		WHERE s.user_id = $1::uuid
		ORDER BY d.name ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.UserDepartmentScope
	for rows.Next() {
		var s model.UserDepartmentScope
		if err := rows.Scan(
			&s.UserID, &s.DepartmentID, &s.DepartmentName, &s.DepartmentCode, &s.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, s)
	}
	return items, rows.Err()
}

// ReplaceForUser sets the scope to exactly the given departments. Empty list
// means the user has no scoped departments (effectively no access for non-
// SUPER_ADMIN roles).
func (r *ScopeRepository) ReplaceForUser(
	ctx context.Context,
	userID string,
	departmentIDs []string,
) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		DELETE FROM user_department_scopes WHERE user_id = $1::uuid
	`, userID); err != nil {
		return err
	}

	for _, depID := range departmentIDs {
		depID = strings.TrimSpace(depID)
		if depID == "" {
			continue
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO user_department_scopes (user_id, department_id)
			VALUES ($1::uuid, $2::uuid)
			ON CONFLICT (user_id, department_id) DO NOTHING
		`, userID, depID); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// HasAccess returns true if the user has the given department in scope. Used
// by RBAC checks at the service layer for non-SUPER_ADMIN roles.
func (r *ScopeRepository) HasAccess(
	ctx context.Context,
	userID string,
	departmentID string,
) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM user_department_scopes
			WHERE user_id = $1::uuid AND department_id = $2::uuid
		)
	`, userID, departmentID).Scan(&exists)
	return exists, err
}

// DepartmentIDsForUser returns the raw department IDs scoped to the user. Used
// to build IN-clauses for filtered listing.
func (r *ScopeRepository) DepartmentIDsForUser(
	ctx context.Context,
	userID string,
) ([]string, error) {
	rows, err := r.db.Query(ctx, `
		SELECT department_id::text FROM user_department_scopes
		WHERE user_id = $1::uuid
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}
