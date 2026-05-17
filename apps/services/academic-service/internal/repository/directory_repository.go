package repository

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/academic-service/internal/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrDepartmentNotFound = errors.New("department not found")
	ErrStudentNotFound    = errors.New("student not found")
	ErrLecturerNotFoundV2 = errors.New("lecturer not found")
	ErrCodeDuplicate      = errors.New("duplicate code")
	ErrNIMDuplicate       = errors.New("duplicate NIM")
	ErrNIDNDuplicate      = errors.New("duplicate NIDN")
	ErrInvalidStatus      = errors.New("invalid status")
)

type DirectoryRepository struct {
	db *pgxpool.Pool
}

func NewDirectoryRepository(db *pgxpool.Pool) *DirectoryRepository {
	return &DirectoryRepository{db: db}
}

// ─── Departments ────────────────────────────────────────────────────────────

func (r *DirectoryRepository) ListDepartments(ctx context.Context) ([]model.Department, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id::text, code, name, created_at
		FROM departments
		ORDER BY name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.Department
	for rows.Next() {
		var d model.Department
		if err := rows.Scan(&d.ID, &d.Code, &d.Name, &d.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, d)
	}
	return items, rows.Err()
}

func (r *DirectoryRepository) CreateDepartment(
	ctx context.Context,
	code string,
	name string,
) (*model.Department, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	name = strings.TrimSpace(name)

	var d model.Department
	err := r.db.QueryRow(ctx, `
		INSERT INTO departments (code, name)
		VALUES ($1, $2)
		RETURNING id::text, code, name, created_at
	`, code, name).Scan(&d.ID, &d.Code, &d.Name, &d.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrCodeDuplicate
		}
		return nil, err
	}
	return &d, nil
}

func (r *DirectoryRepository) UpdateDepartment(
	ctx context.Context,
	id string,
	code string,
	name string,
) (*model.Department, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	name = strings.TrimSpace(name)

	var d model.Department
	err := r.db.QueryRow(ctx, `
		UPDATE departments
		SET code = COALESCE(NULLIF($1, ''), code),
		    name = COALESCE(NULLIF($2, ''), name)
		WHERE id = $3::uuid
		RETURNING id::text, code, name, created_at
	`, code, name, id).Scan(&d.ID, &d.Code, &d.Name, &d.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrDepartmentNotFound
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrCodeDuplicate
		}
		return nil, err
	}
	return &d, nil
}

// ─── Students ───────────────────────────────────────────────────────────────

func (r *DirectoryRepository) ListStudents(
	ctx context.Context,
	statusFilter string,
	search string,
) ([]model.Student, error) {
	args := []interface{}{}
	conds := []string{}

	if statusFilter = strings.TrimSpace(statusFilter); statusFilter != "" {
		args = append(args, strings.ToUpper(statusFilter))
		conds = append(conds, "s.status = $"+itoa(len(args)))
	}
	if search = strings.TrimSpace(search); search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		idx := itoa(len(args))
		conds = append(
			conds,
			"(LOWER(COALESCE(s.nim,'')) LIKE $"+idx+
				" OR LOWER(s.full_name) LIKE $"+idx+
				" OR LOWER(s.email) LIKE $"+idx+")",
		)
	}

	query := `
		SELECT
			s.id::text,
			s.user_id::text,
			COALESCE(s.nim, ''),
			s.full_name,
			s.email,
			COALESCE(s.department_id::text, ''),
			COALESCE(d.name, ''),
			s.status,
			s.created_at,
			s.updated_at
		FROM students s
		LEFT JOIN departments d ON d.id = s.department_id
	`
	if len(conds) > 0 {
		query += " WHERE " + strings.Join(conds, " AND ")
	}
	query += " ORDER BY s.full_name ASC LIMIT 500"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var students []model.Student
	for rows.Next() {
		var s model.Student
		if err := rows.Scan(
			&s.ID, &s.UserID, &s.NIM, &s.FullName, &s.Email,
			&s.DepartmentID, &s.DepartmentName, &s.Status,
			&s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		students = append(students, s)
	}
	return students, rows.Err()
}

// UpsertStudent creates or updates a student record keyed on user_id.
// Used by both Admin Prodi (manual binding with NIM/department) and the
// auto-stub flow (sets status=PENDING_BIND, NIM empty).
func (r *DirectoryRepository) UpsertStudent(
	ctx context.Context,
	userID string,
	nim string,
	fullName string,
	email string,
	departmentID string,
	status string,
) (*model.Student, error) {
	userID = strings.TrimSpace(userID)
	nim = strings.TrimSpace(nim)
	fullName = strings.TrimSpace(fullName)
	email = strings.ToLower(strings.TrimSpace(email))
	departmentID = strings.TrimSpace(departmentID)
	status = strings.ToUpper(strings.TrimSpace(status))
	if status == "" {
		status = "ACTIVE"
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var deptArg interface{}
	if departmentID == "" {
		deptArg = nil
	} else {
		deptArg = departmentID
	}

	var nimArg interface{}
	if nim == "" {
		nimArg = nil
	} else {
		nimArg = nim
	}

	var id string
	err = tx.QueryRow(ctx, `
		INSERT INTO students (user_id, nim, full_name, email, department_id, status)
		VALUES ($1::uuid, $2, $3, $4, NULLIF($5, '')::uuid, $6)
		ON CONFLICT (user_id) DO UPDATE
		SET nim = COALESCE(EXCLUDED.nim, students.nim),
		    full_name = EXCLUDED.full_name,
		    email = EXCLUDED.email,
		    department_id = COALESCE(EXCLUDED.department_id, students.department_id),
		    status = EXCLUDED.status,
		    updated_at = NOW()
		RETURNING id::text
	`, userID, nimArg, fullName, email, deptArg, status).Scan(&id)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if pgErr.ConstraintName != "" && strings.Contains(pgErr.ConstraintName, "nim") {
				return nil, ErrNIMDuplicate
			}
			return nil, ErrNIMDuplicate
		}
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.GetStudentByUserID(ctx, userID)
}

func (r *DirectoryRepository) GetStudentByUserID(
	ctx context.Context,
	userID string,
) (*model.Student, error) {
	var s model.Student
	err := r.db.QueryRow(ctx, `
		SELECT
			s.id::text,
			s.user_id::text,
			COALESCE(s.nim, ''),
			s.full_name,
			s.email,
			COALESCE(s.department_id::text, ''),
			COALESCE(d.name, ''),
			s.status,
			s.created_at,
			s.updated_at
		FROM students s
		LEFT JOIN departments d ON d.id = s.department_id
		WHERE s.user_id = $1::uuid
		LIMIT 1
	`, userID).Scan(
		&s.ID, &s.UserID, &s.NIM, &s.FullName, &s.Email,
		&s.DepartmentID, &s.DepartmentName, &s.Status,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrStudentNotFound
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *DirectoryRepository) SetStudentStatus(
	ctx context.Context,
	userID string,
	status string,
) (*model.Student, error) {
	status = strings.ToUpper(strings.TrimSpace(status))
	if status != "ACTIVE" && status != "INACTIVE" && status != "PENDING_BIND" {
		return nil, ErrInvalidStatus
	}

	cmd, err := r.db.Exec(ctx, `
		UPDATE students SET status = $1, updated_at = NOW()
		WHERE user_id = $2::uuid
	`, status, userID)
	if err != nil {
		return nil, err
	}
	if cmd.RowsAffected() == 0 {
		return nil, ErrStudentNotFound
	}
	return r.GetStudentByUserID(ctx, userID)
}

// ─── Lecturers ──────────────────────────────────────────────────────────────

func (r *DirectoryRepository) ListAllLecturers(
	ctx context.Context,
	statusFilter string,
	search string,
) ([]model.LecturerProfile, error) {
	args := []interface{}{}
	conds := []string{}

	if statusFilter = strings.TrimSpace(statusFilter); statusFilter != "" {
		args = append(args, strings.ToUpper(statusFilter))
		conds = append(conds, "l.status = $"+itoa(len(args)))
	}
	if search = strings.TrimSpace(search); search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		idx := itoa(len(args))
		conds = append(
			conds,
			"(LOWER(COALESCE(l.nidn,'')) LIKE $"+idx+
				" OR LOWER(l.full_name) LIKE $"+idx+
				" OR LOWER(l.email) LIKE $"+idx+")",
		)
	}

	query := `
		SELECT
			l.id::text,
			COALESCE(l.user_id::text, ''),
			COALESCE(l.nidn, ''),
			l.full_name,
			l.email,
			COALESCE(l.department_id::text, ''),
			COALESCE(d.name, ''),
			l.status,
			l.max_supervisor_quota,
			l.created_at,
			l.updated_at
		FROM lecturers l
		LEFT JOIN departments d ON d.id = l.department_id
	`
	if len(conds) > 0 {
		query += " WHERE " + strings.Join(conds, " AND ")
	}
	query += " ORDER BY l.full_name ASC LIMIT 500"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lecturers []model.LecturerProfile
	for rows.Next() {
		var l model.LecturerProfile
		if err := rows.Scan(
			&l.ID, &l.UserID, &l.NIDN, &l.FullName, &l.Email,
			&l.DepartmentID, &l.DepartmentName, &l.Status, &l.MaxSupervisorQuota,
			&l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, err
		}
		lecturers = append(lecturers, l)
	}
	return lecturers, rows.Err()
}

func (r *DirectoryRepository) UpsertLecturer(
	ctx context.Context,
	userID string,
	nidn string,
	fullName string,
	email string,
	departmentID string,
	maxQuota int32,
) (*model.LecturerProfile, error) {
	userID = strings.TrimSpace(userID)
	nidn = strings.TrimSpace(nidn)
	fullName = strings.TrimSpace(fullName)
	email = strings.ToLower(strings.TrimSpace(email))
	departmentID = strings.TrimSpace(departmentID)
	if maxQuota <= 0 {
		maxQuota = 10
	}

	var deptArg interface{}
	if departmentID == "" {
		deptArg = nil
	} else {
		deptArg = departmentID
	}

	var nidnArg interface{}
	if nidn == "" {
		nidnArg = nil
	} else {
		nidnArg = nidn
	}

	var id string
	err := r.db.QueryRow(ctx, `
		INSERT INTO lecturers (user_id, nidn, full_name, email, department_id, max_supervisor_quota, status)
		VALUES ($1::uuid, $2, $3, $4, NULLIF($5, '')::uuid, $6, 'ACTIVE')
		ON CONFLICT (user_id) DO UPDATE
		SET nidn = COALESCE(EXCLUDED.nidn, lecturers.nidn),
		    full_name = EXCLUDED.full_name,
		    email = EXCLUDED.email,
		    department_id = COALESCE(EXCLUDED.department_id, lecturers.department_id),
		    max_supervisor_quota = EXCLUDED.max_supervisor_quota,
		    updated_at = NOW()
		RETURNING id::text
	`, userID, nidnArg, fullName, email, deptArg, maxQuota).Scan(&id)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrNIDNDuplicate
		}
		return nil, err
	}

	return r.GetLecturerByUserID(ctx, userID)
}

func (r *DirectoryRepository) GetLecturerByUserID(
	ctx context.Context,
	userID string,
) (*model.LecturerProfile, error) {
	var l model.LecturerProfile
	err := r.db.QueryRow(ctx, `
		SELECT
			l.id::text,
			COALESCE(l.user_id::text, ''),
			COALESCE(l.nidn, ''),
			l.full_name,
			l.email,
			COALESCE(l.department_id::text, ''),
			COALESCE(d.name, ''),
			l.status,
			l.max_supervisor_quota,
			l.created_at,
			l.updated_at
		FROM lecturers l
		LEFT JOIN departments d ON d.id = l.department_id
		WHERE l.user_id = $1::uuid
		LIMIT 1
	`, userID).Scan(
		&l.ID, &l.UserID, &l.NIDN, &l.FullName, &l.Email,
		&l.DepartmentID, &l.DepartmentName, &l.Status, &l.MaxSupervisorQuota,
		&l.CreatedAt, &l.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrLecturerNotFoundV2
	}
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *DirectoryRepository) SetLecturerStatus(
	ctx context.Context,
	userID string,
	status string,
) (*model.LecturerProfile, error) {
	status = strings.ToUpper(strings.TrimSpace(status))
	if status != "ACTIVE" && status != "INACTIVE" && status != "PENDING_BIND" {
		return nil, ErrInvalidStatus
	}

	cmd, err := r.db.Exec(ctx, `
		UPDATE lecturers SET status = $1, updated_at = NOW()
		WHERE user_id = $2::uuid
	`, status, userID)
	if err != nil {
		return nil, err
	}
	if cmd.RowsAffected() == 0 {
		return nil, ErrLecturerNotFoundV2
	}
	return r.GetLecturerByUserID(ctx, userID)
}

// AutoStubStudent creates a PENDING_BIND student stub if it doesn't exist yet.
// Idempotent: safe to call repeatedly with the same user_id (used by the
// user.registered consumer).
func (r *DirectoryRepository) AutoStubStudent(
	ctx context.Context,
	userID string,
	fullName string,
	email string,
) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO students (user_id, full_name, email, status)
		VALUES ($1::uuid, $2, $3, 'PENDING_BIND')
		ON CONFLICT (user_id) DO NOTHING
	`, userID, fullName, email)
	return err
}

// AutoStubLecturer mirrors AutoStubStudent for lecturers.
func (r *DirectoryRepository) AutoStubLecturer(
	ctx context.Context,
	userID string,
	fullName string,
	email string,
) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO lecturers (user_id, full_name, email, status, max_supervisor_quota)
		VALUES ($1::uuid, $2, $3, 'PENDING_BIND', 10)
		ON CONFLICT (user_id) DO NOTHING
	`, userID, fullName, email)
	return err
}
