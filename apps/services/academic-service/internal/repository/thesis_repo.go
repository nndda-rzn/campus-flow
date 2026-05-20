package repository

import (
	"context"
	"time"

	"github.com/Masterminds/squirrel"
	"campus-flow/apps/services/academic-service/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5"
)

type ThesisRepository struct {
	db *pgxpool.Pool
}

func NewThesisRepository(db *pgxpool.Pool) *ThesisRepository {
	return &ThesisRepository{db: db}
}

// --- Milestones ---

func (r *ThesisRepository) GetMilestonesByDepartment(ctx context.Context, departmentID string) ([]model.ThesisMilestone, error) {
	query, args, err := squirrel.Select(
		"id", "department_id", "code", "name", "description", "sequence_order", "is_active", "created_at", "updated_at",
	).
		From("thesis_milestones").
		Where(squirrel.Eq{"department_id": departmentID, "is_active": true}).
		OrderBy("sequence_order ASC").
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var milestones []model.ThesisMilestone
	for rows.Next() {
		var m model.ThesisMilestone
		if err := rows.Scan(
			&m.ID, &m.DepartmentID, &m.Code, &m.Name, &m.Description, &m.SequenceOrder, &m.IsActive, &m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, err
		}
		milestones = append(milestones, m)
	}
	return milestones, nil
}

func (r *ThesisRepository) CreateMilestone(ctx context.Context, m *model.ThesisMilestone) (*model.ThesisMilestone, error) {
	query, args, err := squirrel.Insert("thesis_milestones").
		Columns("department_id", "code", "name", "description", "sequence_order").
		Values(m.DepartmentID, m.Code, m.Name, m.Description, m.SequenceOrder).
		Suffix("RETURNING id, created_at, updated_at").
		PlaceholderFormat(squirrel.Dollar).
		ToSql()

	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, query, args...).Scan(&m.ID, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *ThesisRepository) UpdateMilestone(ctx context.Context, m *model.ThesisMilestone) error {
	query, args, err := squirrel.Update("thesis_milestones").
		Set("name", m.Name).
		Set("description", m.Description).
		Set("sequence_order", m.SequenceOrder).
		Set("is_active", m.IsActive).
		Set("updated_at", time.Now()).
		Where(squirrel.Eq{"id": m.ID}).
		PlaceholderFormat(squirrel.Dollar).
		ToSql()

	if err != nil {
		return err
	}

	result, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

func (r *ThesisRepository) DeleteMilestone(ctx context.Context, id string) error {
	query, args, err := squirrel.Delete("thesis_milestones").
		Where(squirrel.Eq{"id": id}).
		PlaceholderFormat(squirrel.Dollar).
		ToSql()

	if err != nil {
		return err
	}

	result, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

// --- Progress ---

func (r *ThesisRepository) GetProgressByStudent(ctx context.Context, studentUserID string) ([]model.ThesisProgress, error) {
	query, args, err := squirrel.Select(
		"tp.id", "tp.student_user_id", "tp.supervisor_request_id", "tp.milestone_id",
		"tp.status", "tp.target_date", "tp.completed_at", "tp.notes", "tp.created_at", "tp.updated_at",
		"tm.name", "tm.code", "tm.sequence_order",
	).
		From("thesis_progress tp").
		Join("thesis_milestones tm ON tm.id = tp.milestone_id").
		Where(squirrel.Eq{"tp.student_user_id": studentUserID}).
		OrderBy("tm.sequence_order ASC").
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var progress []model.ThesisProgress
	for rows.Next() {
		var p model.ThesisProgress
		if err := rows.Scan(
			&p.ID, &p.StudentUserID, &p.SupervisorRequestID, &p.MilestoneID,
			&p.Status, &p.TargetDate, &p.CompletedAt, &p.Notes, &p.CreatedAt, &p.UpdatedAt,
			&p.MilestoneName, &p.MilestoneCode, &p.SequenceOrder,
		); err != nil {
			return nil, err
		}
		progress = append(progress, p)
	}
	return progress, nil
}

func (r *ThesisRepository) InitializeProgress(ctx context.Context, tx pgx.Tx, studentUserID, requestID, departmentID string) error {
	milestones, err := r.GetMilestonesByDepartment(ctx, departmentID)
	if err != nil {
		return err
	}

	if len(milestones) == 0 {
		return nil // No milestones defined for this department
	}

	qb := squirrel.Insert("thesis_progress").
		Columns("student_user_id", "supervisor_request_id", "milestone_id", "status", "completed_at").
		PlaceholderFormat(squirrel.Dollar)

	now := time.Now()
	for _, m := range milestones {
		status := "NOT_STARTED"
		var completedAt *time.Time
		
		// Auto-complete first milestone (Topic Approved)
		if m.SequenceOrder == 1 {
			status = "COMPLETED"
			completedAt = &now
		}
		
		qb = qb.Values(studentUserID, requestID, m.ID, status, completedAt)
	}

	query, args, err := qb.ToSql()
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, query, args...)
	return err
}

func (r *ThesisRepository) UpdateProgress(ctx context.Context, id string, notes string, targetDate *time.Time, status string) (*model.ThesisProgress, error) {
	qb := squirrel.Update("thesis_progress").
		Set("notes", notes).
		Set("updated_at", time.Now()).
		Where(squirrel.Eq{"id": id}).
		PlaceholderFormat(squirrel.Dollar)

	if targetDate != nil {
		qb = qb.Set("target_date", targetDate)
	}

	if status != "" {
		qb = qb.Set("status", status)
		if status == "COMPLETED" {
			now := time.Now()
			qb = qb.Set("completed_at", &now)
		} else if status == "NOT_STARTED" || status == "IN_PROGRESS" {
			qb = qb.Set("completed_at", nil) // Clear completed_at
		}
	}

	query, args, err := qb.ToSql()
	if err != nil {
		return nil, err
	}

	result, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	if result.RowsAffected() == 0 {
		return nil, pgx.ErrNoRows
	}

	// Fetch updated record
	var p model.ThesisProgress
	err = r.db.QueryRow(ctx, "SELECT id, student_user_id, supervisor_request_id, milestone_id, status, target_date, completed_at, notes, created_at, updated_at FROM thesis_progress WHERE id = $1", id).
		Scan(&p.ID, &p.StudentUserID, &p.SupervisorRequestID, &p.MilestoneID, &p.Status, &p.TargetDate, &p.CompletedAt, &p.Notes, &p.CreatedAt, &p.UpdatedAt)
	
	if err != nil {
		return nil, err
	}

	return &p, nil
}

// --- Lecturer Progress View ---

// SupervisedStudentProgress represents a student's progress summary for lecturer view
type SupervisedStudentProgress struct {
	StudentUserID         string
	StudentName           string
	StudentNIM            string
	TopicTitle            string
	SupervisorRequestID   string
	TotalMilestones       int
	CompletedMilestones   int
	LastActivityAt        *time.Time
	DaysSinceLastActivity int
	Progress              []model.ThesisProgress
}

// GetProgressByLecturer returns all supervised students with their progress
func (r *ThesisRepository) GetProgressByLecturer(ctx context.Context, lecturerUserID string, includeCompleted bool, stuckThresholdDays int) ([]SupervisedStudentProgress, error) {
	// First, get all supervised students (ACCEPTED status)
	studentsQuery := `
		SELECT 
			sr.id as supervisor_request_id,
			sr.student_user_id,
			sr.topic_title,
			s.full_name as student_name,
			s.nim as student_nim,
			(SELECT COUNT(*) FROM thesis_progress tp WHERE tp.supervisor_request_id = sr.id) as total_milestones,
			(SELECT COUNT(*) FROM thesis_progress tp WHERE tp.supervisor_request_id = sr.id AND tp.status = 'COMPLETED') as completed_milestones,
			(SELECT MAX(tp.updated_at) FROM thesis_progress tp WHERE tp.supervisor_request_id = sr.id) as last_activity_at
		FROM supervisor_requests sr
		JOIN supervisor_assignments sa ON sa.request_id = sr.id AND sa.status = 'ACCEPTED'
		JOIN lecturers l ON l.id = sa.lecturer_id
		JOIN students s ON s.user_id = sr.student_user_id
		WHERE l.user_id = $1 AND sr.status IN ('ACCEPTED', 'COMPLETED')
	`

	if !includeCompleted {
		studentsQuery += ` AND sr.status = 'ACCEPTED'`
	}

	studentsQuery += ` ORDER BY last_activity_at DESC NULLS LAST`

	rows, err := r.db.Query(ctx, studentsQuery, lecturerUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SupervisedStudentProgress
	now := time.Now()

	for rows.Next() {
		var sp SupervisedStudentProgress
		var lastActivity *time.Time

		if err := rows.Scan(
			&sp.SupervisorRequestID,
			&sp.StudentUserID,
			&sp.TopicTitle,
			&sp.StudentName,
			&sp.StudentNIM,
			&sp.TotalMilestones,
			&sp.CompletedMilestones,
			&lastActivity,
		); err != nil {
			return nil, err
		}

		sp.LastActivityAt = lastActivity
		if lastActivity != nil {
			sp.DaysSinceLastActivity = int(now.Sub(*lastActivity).Hours() / 24)
		}

		// Filter by stuck threshold if specified
		if stuckThresholdDays > 0 && sp.DaysSinceLastActivity < stuckThresholdDays {
			continue
		}

		results = append(results, sp)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return results, nil
}

// GetStudentProgressForLecturer returns detailed progress for a specific student
// Validates that the lecturer is the supervisor
func (r *ThesisRepository) GetStudentProgressForLecturer(ctx context.Context, studentUserID, lecturerUserID string) (*SupervisedStudentProgress, error) {
	// Verify lecturer is supervisor and get student info
	query := `
		SELECT 
			sr.id as supervisor_request_id,
			sr.student_user_id,
			sr.topic_title,
			s.full_name as student_name,
			s.nim as student_nim,
			(SELECT COUNT(*) FROM thesis_progress tp WHERE tp.supervisor_request_id = sr.id) as total_milestones,
			(SELECT COUNT(*) FROM thesis_progress tp WHERE tp.supervisor_request_id = sr.id AND tp.status = 'COMPLETED') as completed_milestones,
			(SELECT MAX(tp.updated_at) FROM thesis_progress tp WHERE tp.supervisor_request_id = sr.id) as last_activity_at
		FROM supervisor_requests sr
		JOIN supervisor_assignments sa ON sa.request_id = sr.id AND sa.status = 'ACCEPTED'
		JOIN lecturers l ON l.id = sa.lecturer_id
		JOIN students s ON s.user_id = sr.student_user_id
		WHERE l.user_id = $1 AND sr.student_user_id = $2 AND sr.status IN ('ACCEPTED', 'COMPLETED')
	`

	var sp SupervisedStudentProgress
	var lastActivity *time.Time

	err := r.db.QueryRow(ctx, query, lecturerUserID, studentUserID).Scan(
		&sp.SupervisorRequestID,
		&sp.StudentUserID,
		&sp.TopicTitle,
		&sp.StudentName,
		&sp.StudentNIM,
		&sp.TotalMilestones,
		&sp.CompletedMilestones,
		&lastActivity,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, pgx.ErrNoRows
		}
		return nil, err
	}

	sp.LastActivityAt = lastActivity
	if lastActivity != nil {
		sp.DaysSinceLastActivity = int(time.Now().Sub(*lastActivity).Hours() / 24)
	}

	// Get detailed progress
	progress, err := r.GetProgressByStudent(ctx, studentUserID)
	if err != nil {
		return nil, err
	}
	sp.Progress = progress

	return &sp, nil
}

// GetProgressByID returns a single progress record
func (r *ThesisRepository) GetProgressByID(ctx context.Context, progressID string) (*model.ThesisProgress, error) {
	query := `
		SELECT 
			tp.id, tp.student_user_id, tp.supervisor_request_id, tp.milestone_id,
			tp.status, tp.target_date, tp.completed_at, tp.notes, tp.created_at, tp.updated_at,
			tm.name, tm.code, tm.sequence_order
		FROM thesis_progress tp
		JOIN thesis_milestones tm ON tm.id = tp.milestone_id
		WHERE tp.id = $1
	`

	var p model.ThesisProgress
	err := r.db.QueryRow(ctx, query, progressID).Scan(
		&p.ID, &p.StudentUserID, &p.SupervisorRequestID, &p.MilestoneID,
		&p.Status, &p.TargetDate, &p.CompletedAt, &p.Notes, &p.CreatedAt, &p.UpdatedAt,
		&p.MilestoneName, &p.MilestoneCode, &p.SequenceOrder,
	)

	if err != nil {
		return nil, err
	}

	return &p, nil
}

// ValidateLecturerSupervisesStudent checks if lecturer is the supervisor of the student
func (r *ThesisRepository) ValidateLecturerSupervisesStudent(ctx context.Context, lecturerUserID, studentUserID string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM supervisor_requests sr
			JOIN supervisor_assignments sa ON sa.request_id = sr.id AND sa.status = 'ACCEPTED'
			JOIN lecturers l ON l.id = sa.lecturer_id
			WHERE l.user_id = $1 AND sr.student_user_id = $2 AND sr.status IN ('ACCEPTED', 'COMPLETED')
		)
	`

	var exists bool
	err := r.db.QueryRow(ctx, query, lecturerUserID, studentUserID).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}

// ValidateLecturerSupervisesProgress checks if lecturer supervises the student who owns this progress
func (r *ThesisRepository) ValidateLecturerSupervisesProgress(ctx context.Context, lecturerUserID, progressID string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM thesis_progress tp
			JOIN supervisor_requests sr ON sr.id = tp.supervisor_request_id
			JOIN supervisor_assignments sa ON sa.request_id = sr.id AND sa.status = 'ACCEPTED'
			JOIN lecturers l ON l.id = sa.lecturer_id
			WHERE tp.id = $1 AND l.user_id = $2 AND sr.status IN ('ACCEPTED', 'COMPLETED')
		)
	`

	var exists bool
	err := r.db.QueryRow(ctx, query, progressID, lecturerUserID).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}
