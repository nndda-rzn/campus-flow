package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrDelegationNotFound  = errors.New("delegation not found")
	ErrDelegationOverlap   = errors.New("active delegation already exists for this period")
	ErrDelegationInvalid   = errors.New("invalid delegation parameters")
)

type Delegation struct {
	ID              string
	DelegatorUserID string
	DelegateUserID  string
	DelegateName    string
	Reason          string
	StartsAt        time.Time
	EndsAt          time.Time
	IsActive        bool
	RevokedAt       *time.Time
	CreatedAt       time.Time
}

type DelegationRepository struct {
	db *pgxpool.Pool
}

func NewDelegationRepository(db *pgxpool.Pool) *DelegationRepository {
	return &DelegationRepository{db: db}
}

func (r *DelegationRepository) List(
	ctx context.Context,
	delegatorUserID string,
	includeExpired bool,
) ([]Delegation, error) {
	query := `
		SELECT id, delegator_user_id::text, delegate_user_id::text, delegate_name,
		       reason, starts_at, ends_at, is_active, revoked_at, created_at
		FROM kaprodi_delegations
		WHERE delegator_user_id = $1::uuid
	`
	if !includeExpired {
		query += ` AND (is_active = TRUE AND ends_at > NOW())`
	}
	query += ` ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query, delegatorUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Delegation
	for rows.Next() {
		var d Delegation
		if err := rows.Scan(
			&d.ID, &d.DelegatorUserID, &d.DelegateUserID, &d.DelegateName,
			&d.Reason, &d.StartsAt, &d.EndsAt, &d.IsActive, &d.RevokedAt, &d.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, d)
	}
	return items, rows.Err()
}

func (r *DelegationRepository) Create(
	ctx context.Context,
	delegatorUserID, delegateUserID, delegateName, reason string,
	startsAt, endsAt time.Time,
) (*Delegation, error) {
	// Check for overlapping active delegations
	var overlapCount int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM kaprodi_delegations
		WHERE delegator_user_id = $1::uuid
		  AND is_active = TRUE
		  AND starts_at < $3
		  AND ends_at > $2
	`, delegatorUserID, startsAt, endsAt).Scan(&overlapCount)
	if err != nil {
		return nil, err
	}
	if overlapCount > 0 {
		return nil, ErrDelegationOverlap
	}

	var d Delegation
	err = r.db.QueryRow(ctx, `
		INSERT INTO kaprodi_delegations (
			delegator_user_id, delegate_user_id, delegate_name, reason, starts_at, ends_at
		)
		VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
		RETURNING id, delegator_user_id::text, delegate_user_id::text, delegate_name,
		          reason, starts_at, ends_at, is_active, revoked_at, created_at
	`, delegatorUserID, delegateUserID, delegateName, reason, startsAt, endsAt,
	).Scan(
		&d.ID, &d.DelegatorUserID, &d.DelegateUserID, &d.DelegateName,
		&d.Reason, &d.StartsAt, &d.EndsAt, &d.IsActive, &d.RevokedAt, &d.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DelegationRepository) Revoke(ctx context.Context, id, actorUserID string) (*Delegation, error) {
	var d Delegation
	err := r.db.QueryRow(ctx, `
		UPDATE kaprodi_delegations
		SET is_active = FALSE, revoked_at = NOW(), updated_at = NOW()
		WHERE id = $1::uuid AND delegator_user_id = $2::uuid AND is_active = TRUE
		RETURNING id, delegator_user_id::text, delegate_user_id::text, delegate_name,
		          reason, starts_at, ends_at, is_active, revoked_at, created_at
	`, id, actorUserID).Scan(
		&d.ID, &d.DelegatorUserID, &d.DelegateUserID, &d.DelegateName,
		&d.Reason, &d.StartsAt, &d.EndsAt, &d.IsActive, &d.RevokedAt, &d.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrDelegationNotFound
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// CheckActive checks if a user has an active delegation right now.
func (r *DelegationRepository) CheckActive(ctx context.Context, userID string) (*Delegation, error) {
	var d Delegation
	err := r.db.QueryRow(ctx, `
		SELECT id, delegator_user_id::text, delegate_user_id::text, delegate_name,
		       reason, starts_at, ends_at, is_active, revoked_at, created_at
		FROM kaprodi_delegations
		WHERE delegate_user_id = $1::uuid
		  AND is_active = TRUE
		  AND starts_at <= NOW()
		  AND ends_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`, userID).Scan(
		&d.ID, &d.DelegatorUserID, &d.DelegateUserID, &d.DelegateName,
		&d.Reason, &d.StartsAt, &d.EndsAt, &d.IsActive, &d.RevokedAt, &d.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil // No active delegation
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}
