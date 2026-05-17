package repository

import (
	"context"
	"errors"

	"campus-flow/apps/services/auth-service/internal/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrRefreshTokenNotFound = errors.New("refresh token not found")

type TokenRepository struct {
	db *pgxpool.Pool
}

func NewTokenRepository(db *pgxpool.Pool) *TokenRepository {
	return &TokenRepository{
		db: db,
	}
}

func (r *TokenRepository) CreateRefreshToken(
	ctx context.Context,
	userID string,
	tokenHash string,
	expiresAt string,
) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1::uuid, $2, $3::timestamp)
	`, userID, tokenHash, expiresAt)

	return err
}

func (r *TokenRepository) FindValidRefreshToken(
	ctx context.Context,
	tokenHash string,
) (*model.RefreshToken, error) {
	var token model.RefreshToken

	err := r.db.QueryRow(ctx, `
		SELECT 
			id::text,
			user_id::text,
			token_hash,
			is_revoked,
			created_at,
			expires_at
		FROM refresh_tokens
		WHERE token_hash = $1
		  AND is_revoked = FALSE
		  AND expires_at > NOW()
		LIMIT 1
	`, tokenHash).Scan(
		&token.ID,
		&token.UserID,
		&token.TokenHash,
		&token.IsRevoked,
		&token.CreatedAt,
		&token.ExpiresAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrRefreshTokenNotFound
	}

	if err != nil {
		return nil, err
	}

	return &token, nil
}

func (r *TokenRepository) RevokeRefreshTokenByHash(
	ctx context.Context,
	tokenHash string,
) error {
	_, err := r.db.Exec(ctx, `
		UPDATE refresh_tokens
		SET is_revoked = TRUE
		WHERE token_hash = $1
	`, tokenHash)

	return err
}

// RevokeAllForUser revokes every active refresh token for a user. Used by
// password change so other sessions are invalidated immediately.
func (r *TokenRepository) RevokeAllForUser(
	ctx context.Context,
	userID string,
) error {
	_, err := r.db.Exec(ctx, `
		UPDATE refresh_tokens
		SET is_revoked = TRUE
		WHERE user_id = $1::uuid AND is_revoked = FALSE
	`, userID)

	return err
}