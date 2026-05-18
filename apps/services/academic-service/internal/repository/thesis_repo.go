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
