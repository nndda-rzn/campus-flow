package repository

import (
	"context"
	"time"

	"github.com/Masterminds/squirrel"
	"campus-flow/apps/services/academic-service/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5"
)

type GuidanceLogRepository struct {
	db *pgxpool.Pool
}

func NewGuidanceLogRepository(db *pgxpool.Pool) *GuidanceLogRepository {
	return &GuidanceLogRepository{db: db}
}

func (r *GuidanceLogRepository) GetLogsByStudent(ctx context.Context, studentUserID string) ([]model.GuidanceLog, error) {
	return r.fetchLogs(ctx, squirrel.Eq{"gl.student_user_id": studentUserID})
}

func (r *GuidanceLogRepository) GetLogsByLecturer(ctx context.Context, lecturerUserID string) ([]model.GuidanceLog, error) {
	// For lecturer, we want to show SUBMITTED, APPROVED, and REVISION_REQUIRED. Not DRAFT.
	return r.fetchLogs(ctx, squirrel.And{
		squirrel.Eq{"gl.lecturer_user_id": lecturerUserID},
		squirrel.NotEq{"gl.status": "DRAFT"},
	})
}

func (r *GuidanceLogRepository) GetLogByID(ctx context.Context, id string) (*model.GuidanceLog, error) {
	logs, err := r.fetchLogs(ctx, squirrel.Eq{"gl.id": id})
	if err != nil {
		return nil, err
	}
	if len(logs) == 0 {
		return nil, pgx.ErrNoRows
	}
	return &logs[0], nil
}

func (r *GuidanceLogRepository) fetchLogs(ctx context.Context, cond squirrel.Sqlizer) ([]model.GuidanceLog, error) {
	query, args, err := squirrel.Select(
		"gl.id", "gl.student_user_id", "gl.supervisor_request_id", "gl.lecturer_user_id",
		"gl.session_date", "gl.start_time", "gl.end_time", "gl.topic", "gl.discussion_summary",
		"gl.next_action", "gl.status", "gl.submitted_at", "gl.supervisor_feedback", "gl.approved_at",
		"gl.created_at", "gl.updated_at",
		"COALESCE(s.full_name, '') as student_name",
		"COALESCE(l.full_name, '') as lecturer_name",
	).
		From("guidance_logs gl").
		LeftJoin("students s ON s.user_id = gl.student_user_id").
		LeftJoin("lecturers l ON l.user_id = gl.lecturer_user_id").
		Where(cond).
		OrderBy("gl.session_date DESC, gl.created_at DESC").
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

	var logs []model.GuidanceLog
	for rows.Next() {
		var l model.GuidanceLog
		if err := rows.Scan(
			&l.ID, &l.StudentUserID, &l.SupervisorRequestID, &l.LecturerUserID,
			&l.SessionDate, &l.StartTime, &l.EndTime, &l.Topic, &l.DiscussionSummary,
			&l.NextAction, &l.Status, &l.SubmittedAt, &l.SupervisorFeedback, &l.ApprovedAt,
			&l.CreatedAt, &l.UpdatedAt,
			&l.StudentName, &l.LecturerName,
		); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, nil
}

func (r *GuidanceLogRepository) CreateLog(ctx context.Context, log *model.GuidanceLog) (*model.GuidanceLog, error) {
	query, args, err := squirrel.Insert("guidance_logs").
		Columns(
			"student_user_id", "supervisor_request_id", "lecturer_user_id",
			"session_date", "start_time", "end_time", "topic", "discussion_summary",
			"next_action", "status",
		).
		Values(
			log.StudentUserID, log.SupervisorRequestID, log.LecturerUserID,
			log.SessionDate, log.StartTime, log.EndTime, log.Topic, log.DiscussionSummary,
			log.NextAction, log.Status,
		).
		Suffix("RETURNING id, created_at, updated_at").
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
		
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, query, args...).Scan(&log.ID, &log.CreatedAt, &log.UpdatedAt)
	if err != nil {
		return nil, err
	}
	
	return log, nil
}

func (r *GuidanceLogRepository) UpdateLog(ctx context.Context, log *model.GuidanceLog) error {
	query, args, err := squirrel.Update("guidance_logs").
		Set("session_date", log.SessionDate).
		Set("start_time", log.StartTime).
		Set("end_time", log.EndTime).
		Set("topic", log.Topic).
		Set("discussion_summary", log.DiscussionSummary).
		Set("next_action", log.NextAction).
		Set("status", log.Status).
		Set("submitted_at", log.SubmittedAt).
		Set("supervisor_feedback", log.SupervisorFeedback).
		Set("approved_at", log.ApprovedAt).
		Set("updated_at", time.Now()).
		Where(squirrel.Eq{"id": log.ID}).
		PlaceholderFormat(squirrel.Dollar).
		ToSql()
		
	if err != nil {
		return err
	}

	_, err = r.db.Exec(ctx, query, args...)
	return err
}

func (r *GuidanceLogRepository) DeleteLog(ctx context.Context, id string) error {
	query, args, err := squirrel.Delete("guidance_logs").
		Where(squirrel.Eq{"id": id, "status": "DRAFT"}). // Only DRAFT can be deleted
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
