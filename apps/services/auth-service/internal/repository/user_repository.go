package repository

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/auth-service/internal/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrUserNotFound   = errors.New("user not found")
	ErrEmailDuplicate = errors.New("email already registered")
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{
		db: db,
	}
}

func (r *UserRepository) CreateUserWithRole(
	ctx context.Context,
	fullName string,
	email string,
	passwordHash string,
	roleName string,
) (*model.User, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	email = strings.ToLower(strings.TrimSpace(email))
	roleName = strings.ToUpper(strings.TrimSpace(roleName))

	var user model.User

	err = tx.QueryRow(ctx, `
		INSERT INTO users (full_name, email, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id::text, full_name, email, password_hash, status, created_at, updated_at
	`, fullName, email, passwordHash).Scan(
		&user.ID,
		&user.FullName,
		&user.Email,
		&user.PasswordHash,
		&user.Status,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrEmailDuplicate
		}
		return nil, err
	}

	var roleID string

	err = tx.QueryRow(ctx, `
		SELECT id::text
		FROM roles
		WHERE name = $1
	`, roleName).Scan(&roleID)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO user_roles (user_id, role_id)
		VALUES ($1::uuid, $2::uuid)
		ON CONFLICT DO NOTHING
	`, user.ID, roleID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	user.Role = roleName

	return &user, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	var user model.User

	err := r.db.QueryRow(ctx, `
		SELECT 
			u.id::text,
			u.full_name,
			u.email,
			u.password_hash,
			u.status,
			r.name,
			u.created_at,
			u.updated_at
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id
		JOIN roles r ON r.id = ur.role_id
		WHERE u.email = $1
		LIMIT 1
	`, email).Scan(
		&user.ID,
		&user.FullName,
		&user.Email,
		&user.PasswordHash,
		&user.Status,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) FindByID(ctx context.Context, userID string) (*model.User, error) {
	var user model.User

	err := r.db.QueryRow(ctx, `
		SELECT 
			u.id::text,
			u.full_name,
			u.email,
			u.password_hash,
			u.status,
			r.name,
			u.created_at,
			u.updated_at
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id
		JOIN roles r ON r.id = ur.role_id
		WHERE u.id = $1::uuid
		LIMIT 1
	`, userID).Scan(
		&user.ID,
		&user.FullName,
		&user.Email,
		&user.PasswordHash,
		&user.Status,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}

	if err != nil {
		return nil, err
	}

	return &user, nil
}
