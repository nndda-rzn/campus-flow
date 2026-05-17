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
	ErrUserNotFound      = errors.New("user not found")
	ErrEmailDuplicate    = errors.New("email already registered")
	ErrRoleNotFound      = errors.New("role not found")
	ErrInvalidUserStatus = errors.New("invalid user status")
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
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrRoleNotFound
	}
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

	// Emit user.registered into outbox so academic-service can auto-stub a
	// student/lecturer record (PENDING_BIND) and notification-service can be
	// notified later if needed.
	_, err = tx.Exec(ctx, `
		INSERT INTO outbox_events (
			aggregate_id,
			aggregate_type,
			event_type,
			payload
		)
		VALUES (
			$1::uuid,
			'users',
			'user.registered',
			jsonb_build_object(
				'user_id', $1::text,
				'full_name', $2::text,
				'email', $3::text,
				'role', $4::text
			)
		)
	`, user.ID, user.FullName, user.Email, roleName)
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

// ─── Admin methods (Epic 2) ─────────────────────────────────────────────────

// ListUsers returns users matching optional role/status/search filters.
func (r *UserRepository) ListUsers(
	ctx context.Context,
	roleFilter string,
	statusFilter string,
	search string,
) ([]model.User, error) {
	roleFilter = strings.ToUpper(strings.TrimSpace(roleFilter))
	statusFilter = strings.ToUpper(strings.TrimSpace(statusFilter))
	search = strings.TrimSpace(search)

	args := []interface{}{}
	conds := []string{}

	if roleFilter != "" {
		args = append(args, roleFilter)
		conds = append(conds, "r.name = $"+itoa(len(args)))
	}
	if statusFilter != "" {
		args = append(args, statusFilter)
		conds = append(conds, "u.status = $"+itoa(len(args)))
	}
	if search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		idx := itoa(len(args))
		conds = append(conds, "(LOWER(u.email) LIKE $"+idx+" OR LOWER(u.full_name) LIKE $"+idx+")")
	}

	query := `
		SELECT
			u.id::text,
			u.full_name,
			u.email,
			u.status,
			COALESCE(r.name, ''),
			u.created_at,
			u.updated_at
		FROM users u
		LEFT JOIN user_roles ur ON ur.user_id = u.id
		LEFT JOIN roles r ON r.id = ur.role_id
	`

	if len(conds) > 0 {
		query += " WHERE " + strings.Join(conds, " AND ")
	}

	query += " ORDER BY u.created_at DESC LIMIT 500"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		var u model.User
		if err := rows.Scan(
			&u.ID, &u.FullName, &u.Email, &u.Status, &u.Role, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// ListByRole returns active users with a specific role. Used by services that
// need to broadcast notifications to all users with a given role (e.g. Kaprodi).
func (r *UserRepository) ListByRole(ctx context.Context, role string) ([]model.User, error) {
	role = strings.ToUpper(strings.TrimSpace(role))

	rows, err := r.db.Query(ctx, `
		SELECT
			u.id::text,
			u.full_name,
			u.email,
			u.status,
			r.name,
			u.created_at,
			u.updated_at
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id
		JOIN roles r ON r.id = ur.role_id
		WHERE r.name = $1 AND u.status = 'ACTIVE'
		ORDER BY u.full_name ASC
	`, role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		var u model.User
		if err := rows.Scan(
			&u.ID, &u.FullName, &u.Email, &u.Status, &u.Role, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// UpdateUser updates the editable user profile fields and writes an audit log
// + outbox event in the same transaction.
func (r *UserRepository) UpdateUser(
	ctx context.Context,
	userID string,
	actorUserID string,
	fullName string,
	email string,
) (*model.User, error) {
	fullName = strings.TrimSpace(fullName)
	email = strings.ToLower(strings.TrimSpace(email))

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	cmd, err := tx.Exec(ctx, `
		UPDATE users
		SET full_name = COALESCE(NULLIF($1, ''), full_name),
		    email = COALESCE(NULLIF($2, ''), email),
		    updated_at = NOW()
		WHERE id = $3::uuid
	`, fullName, email, userID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrEmailDuplicate
		}
		return nil, err
	}
	if cmd.RowsAffected() == 0 {
		return nil, ErrUserNotFound
	}

	if err := writeAuditLogTx(ctx, tx, actorUserID, "USER_UPDATED", "users", userID, map[string]string{
		"full_name": fullName,
		"email":     email,
	}); err != nil {
		return nil, err
	}

	if err := writeOutboxTx(ctx, tx, userID, "user.updated", map[string]string{
		"user_id":   userID,
		"full_name": fullName,
		"email":     email,
	}); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.FindByID(ctx, userID)
}

// SetStatus sets user status (ACTIVE / INACTIVE).
func (r *UserRepository) SetStatus(
	ctx context.Context,
	userID string,
	actorUserID string,
	status string,
) (*model.User, error) {
	status = strings.ToUpper(strings.TrimSpace(status))
	if status != "ACTIVE" && status != "INACTIVE" {
		return nil, ErrInvalidUserStatus
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	cmd, err := tx.Exec(ctx, `
		UPDATE users SET status = $1, updated_at = NOW()
		WHERE id = $2::uuid
	`, status, userID)
	if err != nil {
		return nil, err
	}
	if cmd.RowsAffected() == 0 {
		return nil, ErrUserNotFound
	}

	if err := writeAuditLogTx(ctx, tx, actorUserID, "USER_STATUS_CHANGED", "users", userID, map[string]string{
		"status": status,
	}); err != nil {
		return nil, err
	}

	if err := writeOutboxTx(ctx, tx, userID, "user.status_changed", map[string]string{
		"user_id": userID,
		"status":  status,
	}); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.FindByID(ctx, userID)
}

// LogLogin records a login event in audit_logs and outbox so other services
// can react if needed. Failures are non-fatal — they should never block a
// successful authentication.
func (r *UserRepository) LogLogin(
	ctx context.Context,
	userID string,
	ipAddress string,
	userAgent string,
) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if err := writeAuditLogTx(ctx, tx, userID, "USER_LOGIN", "users", userID, map[string]string{
		"ip_address": ipAddress,
		"user_agent": userAgent,
	}); err != nil {
		return err
	}

	if err := writeOutboxTx(ctx, tx, userID, "user.login", map[string]string{
		"user_id":    userID,
		"ip_address": ipAddress,
		"user_agent": userAgent,
	}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
func (r *UserRepository) AssignRole(
	ctx context.Context,
	userID string,
	actorUserID string,
	role string,
) (*model.User, error) {
	role = strings.ToUpper(strings.TrimSpace(role))

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var roleID string
	err = tx.QueryRow(ctx, `SELECT id::text FROM roles WHERE name = $1`, role).Scan(&roleID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrRoleNotFound
	}
	if err != nil {
		return nil, err
	}

	var exists bool
	err = tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM users WHERE id = $1::uuid)`, userID).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrUserNotFound
	}

	if _, err = tx.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1::uuid`, userID); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(ctx, `
		INSERT INTO user_roles (user_id, role_id)
		VALUES ($1::uuid, $2::uuid)
	`, userID, roleID); err != nil {
		return nil, err
	}

	if err := writeAuditLogTx(ctx, tx, actorUserID, "USER_ROLE_CHANGED", "users", userID, map[string]string{
		"role": role,
	}); err != nil {
		return nil, err
	}

	if err := writeOutboxTx(ctx, tx, userID, "user.role_changed", map[string]string{
		"user_id": userID,
		"role":    role,
	}); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.FindByID(ctx, userID)
}

// UpdatePassword swaps the bcrypt hash for the given user. Caller is
// expected to have already verified the current password where applicable.
func (r *UserRepository) UpdatePassword(
	ctx context.Context,
	userID string,
	passwordHash string,
) error {
	cmd, err := r.db.Exec(ctx, `
		UPDATE users SET password_hash = $1, updated_at = NOW()
		WHERE id = $2::uuid
	`, passwordHash, userID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}
