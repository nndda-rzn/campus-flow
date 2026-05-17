package repository

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"campus-flow/apps/services/academic-service/internal/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrAnnouncementNotFound = errors.New("announcement not found")
)

type AnnouncementRepository struct {
	db *pgxpool.Pool
}

func NewAnnouncementRepository(db *pgxpool.Pool) *AnnouncementRepository {
	return &AnnouncementRepository{db: db}
}

// List returns announcements visible to the given role. If viewerRole is
// empty, all are returned. Inactive ones are filtered out unless
// includeInactive is true (admin-only path).
func (r *AnnouncementRepository) List(
	ctx context.Context,
	viewerRole string,
	includeInactive bool,
) ([]model.Announcement, error) {
	args := []interface{}{}
	conds := []string{}

	if !includeInactive {
		conds = append(conds, "is_active = TRUE")
		conds = append(conds, "(starts_at IS NULL OR starts_at <= NOW())")
		conds = append(conds, "(ends_at IS NULL OR ends_at >= NOW())")
	}

	if viewerRole = strings.ToUpper(strings.TrimSpace(viewerRole)); viewerRole != "" {
		args = append(args, viewerRole)
		// Either target_roles is empty (== broadcast), or contains the role.
		conds = append(conds,
			"(jsonb_array_length(target_roles) = 0 OR target_roles ? $"+itoa(len(args))+")",
		)
	}

	query := `
		SELECT
			id::text,
			title,
			body,
			severity,
			author_user_id::text,
			author_name,
			target_roles::text,
			is_active,
			starts_at,
			ends_at,
			created_at,
			updated_at
		FROM announcements
	`
	if len(conds) > 0 {
		query += " WHERE " + strings.Join(conds, " AND ")
	}
	query += " ORDER BY starts_at DESC LIMIT 200"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.Announcement
	for rows.Next() {
		var (
			a              model.Announcement
			rolesJSON      string
		)
		if err := rows.Scan(
			&a.ID, &a.Title, &a.Body, &a.Severity,
			&a.AuthorUserID, &a.AuthorName,
			&rolesJSON,
			&a.IsActive,
			&a.StartsAt, &a.EndsAt,
			&a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal([]byte(rolesJSON), &a.TargetRoles)
		items = append(items, a)
	}
	return items, rows.Err()
}

func (r *AnnouncementRepository) Create(
	ctx context.Context,
	a model.Announcement,
) (*model.Announcement, error) {
	rolesJSON, err := json.Marshal(a.TargetRoles)
	if err != nil {
		return nil, err
	}

	var endsAtArg interface{}
	if a.EndsAt != nil {
		endsAtArg = *a.EndsAt
	}

	var startsAtArg interface{}
	if !a.StartsAt.IsZero() {
		startsAtArg = a.StartsAt
	}

	var id string
	err = r.db.QueryRow(ctx, `
		INSERT INTO announcements (
			title, body, severity, author_user_id, author_name,
			target_roles, starts_at, ends_at
		)
		VALUES ($1, $2, $3, $4::uuid, $5, $6::jsonb,
		        COALESCE($7::timestamp, NOW()), $8::timestamp)
		RETURNING id::text
	`, a.Title, a.Body, a.Severity, a.AuthorUserID, a.AuthorName,
		string(rolesJSON), startsAtArg, endsAtArg,
	).Scan(&id)
	if err != nil {
		return nil, err
	}

	return r.Get(ctx, id)
}

func (r *AnnouncementRepository) Update(
	ctx context.Context,
	id string,
	title string,
	body string,
	severity string,
	targetRoles []string,
	endsAt *string,
) (*model.Announcement, error) {
	rolesJSON, err := json.Marshal(targetRoles)
	if err != nil {
		return nil, err
	}

	var endsArg interface{}
	if endsAt != nil && strings.TrimSpace(*endsAt) != "" {
		endsArg = *endsAt
	}

	cmd, err := r.db.Exec(ctx, `
		UPDATE announcements
		SET title = COALESCE(NULLIF($1, ''), title),
		    body = COALESCE(NULLIF($2, ''), body),
		    severity = COALESCE(NULLIF($3, ''), severity),
		    target_roles = $4::jsonb,
		    ends_at = COALESCE($5::timestamp, ends_at),
		    updated_at = NOW()
		WHERE id = $6::uuid
	`, title, body, severity, string(rolesJSON), endsArg, id)
	if err != nil {
		return nil, err
	}
	if cmd.RowsAffected() == 0 {
		return nil, ErrAnnouncementNotFound
	}
	return r.Get(ctx, id)
}

func (r *AnnouncementRepository) Deactivate(
	ctx context.Context,
	id string,
) (*model.Announcement, error) {
	cmd, err := r.db.Exec(ctx, `
		UPDATE announcements SET is_active = FALSE, updated_at = NOW()
		WHERE id = $1::uuid
	`, id)
	if err != nil {
		return nil, err
	}
	if cmd.RowsAffected() == 0 {
		return nil, ErrAnnouncementNotFound
	}
	return r.Get(ctx, id)
}

func (r *AnnouncementRepository) Get(
	ctx context.Context,
	id string,
) (*model.Announcement, error) {
	var (
		a         model.Announcement
		rolesJSON string
	)
	err := r.db.QueryRow(ctx, `
		SELECT
			id::text, title, body, severity,
			author_user_id::text, author_name,
			target_roles::text, is_active,
			starts_at, ends_at, created_at, updated_at
		FROM announcements
		WHERE id = $1::uuid
		LIMIT 1
	`, id).Scan(
		&a.ID, &a.Title, &a.Body, &a.Severity,
		&a.AuthorUserID, &a.AuthorName,
		&rolesJSON, &a.IsActive,
		&a.StartsAt, &a.EndsAt,
		&a.CreatedAt, &a.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrAnnouncementNotFound
	}
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal([]byte(rolesJSON), &a.TargetRoles)
	return &a, nil
}
