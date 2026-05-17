package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrResetTokenNotFound = errors.New("password reset token not found")

type PasswordResetRepository struct {
	db *pgxpool.Pool
}

func NewPasswordResetRepository(db *pgxpool.Pool) *PasswordResetRepository {
	return &PasswordResetRepository{db: db}
}

// CreateToken stores a hashed reset token. Caller is expected to send the raw
// token via mail. The hash column is the SHA-256 of the raw token.
func (r *PasswordResetRepository) CreateToken(
	ctx context.Context,
	userID, tokenHash string,
	expiresAt time.Time,
) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		VALUES ($1::uuid, $2, $3::timestamp)
	`, userID, tokenHash, expiresAt.Format("2006-01-02 15:04:05"))
	return err
}

type ResetTokenRecord struct {
	ID        string
	UserID    string
	ExpiresAt time.Time
	UsedAt    *time.Time
}

// FindValidToken returns the unused, unexpired token row matching the hash.
func (r *PasswordResetRepository) FindValidToken(
	ctx context.Context,
	tokenHash string,
) (*ResetTokenRecord, error) {
	var rec ResetTokenRecord
	err := r.db.QueryRow(ctx, `
		SELECT id::text, user_id::text, expires_at, used_at
		FROM password_reset_tokens
		WHERE token_hash = $1
		  AND used_at IS NULL
		  AND expires_at > NOW()
		LIMIT 1
	`, tokenHash).Scan(&rec.ID, &rec.UserID, &rec.ExpiresAt, &rec.UsedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrResetTokenNotFound
	}
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

// MarkUsed flips used_at on a token row, preventing reuse.
func (r *PasswordResetRepository) MarkUsed(
	ctx context.Context,
	id string,
) error {
	cmd, err := r.db.Exec(ctx, `
		UPDATE password_reset_tokens SET used_at = NOW()
		WHERE id = $1::uuid AND used_at IS NULL
	`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrResetTokenNotFound
	}
	return nil
}

// PurgeUserTokens revokes any unused tokens for the user. Called when a
// user successfully resets to ensure remaining tokens are invalidated.
func (r *PasswordResetRepository) PurgeUserTokens(
	ctx context.Context,
	userID string,
) error {
	_, err := r.db.Exec(ctx, `
		UPDATE password_reset_tokens SET used_at = NOW()
		WHERE user_id = $1::uuid AND used_at IS NULL
	`, userID)
	return err
}
