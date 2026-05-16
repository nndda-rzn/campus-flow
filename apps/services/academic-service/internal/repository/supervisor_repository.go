package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"campus-flow/apps/services/academic-service/internal/model"

	"github.com/jackc/pgx/v5/pgconn"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrSupervisorRequestNotFound = errors.New("supervisor request not found")
	ErrLecturerNotFound          = errors.New("lecturer not found")
	ErrLecturerNotAssigned       = errors.New("lecturer not assigned to request")
)

type SupervisorRepository struct {
	db *pgxpool.Pool
}

func NewSupervisorRepository(db *pgxpool.Pool) *SupervisorRepository {
	return &SupervisorRepository{db: db}
}

func (r *SupervisorRepository) ListLecturers(ctx context.Context) ([]model.Lecturer, error) {
	rows, err := r.db.Query(
		ctx, `
		SELECT
			id::text,
			COALESCE(user_id::text, ''),
			COALESCE(nidn, ''),
			full_name,
			email,
			status,
			max_supervisor_quota
		FROM lecturers
		WHERE status = 'ACTIVE'
		ORDER BY full_name ASC
	`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lecturers []model.Lecturer

	for rows.Next() {
		var lecturer model.Lecturer
		if err := rows.Scan(
			&lecturer.ID,
			&lecturer.UserID,
			&lecturer.NIDN,
			&lecturer.FullName,
			&lecturer.Email,
			&lecturer.Status,
			&lecturer.MaxSupervisorQuota,
		); err != nil {
			return nil, err
		}

		lecturers = append(lecturers, lecturer)
	}

	return lecturers, rows.Err()
}

func (r *SupervisorRepository) CreateSupervisorRequest(
	ctx context.Context,
	studentUserID string,
	topicTitle string,
	topicDescription string,
	lecturerIDs []string,
) (*model.SupervisorRequest, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	requestNumber := generateSupervisorRequestNumber()

	var req model.SupervisorRequest

	err = tx.QueryRow(
		ctx, `
		INSERT INTO supervisor_requests (
			request_number,
			student_user_id,
			topic_title,
			topic_description,
			status
		)
		VALUES ($1, $2::uuid, $3, $4, 'SUBMITTED')
		RETURNING
			id::text,
			request_number,
			student_user_id::text,
			topic_title,
			topic_description,
			status,
			created_at,
			updated_at
	`, requestNumber, studentUserID, topicTitle, topicDescription,
	).Scan(
		&req.ID,
		&req.RequestNumber,
		&req.StudentUserID,
		&req.TopicTitle,
		&req.TopicDescription,
		&req.Status,
		&req.CreatedAt,
		&req.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	for index, lecturerID := range lecturerIDs {
		_, err = tx.Exec(
			ctx, `
			INSERT INTO supervisor_request_choices (
				request_id,
				lecturer_id,
				priority
			)
			VALUES ($1::uuid, $2::uuid, $3)
		`, req.ID, lecturerID, index+1,
		)
		if err != nil {
			return nil, err
		}
	}

	_, err = tx.Exec(
		ctx, `
		INSERT INTO supervisor_status_histories (
			request_id,
			old_status,
			new_status,
			actor_user_id,
			note
		)
		VALUES ($1::uuid, NULL, 'SUBMITTED', $2::uuid, 'Supervisor request submitted by student')
	`, req.ID, studentUserID,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(
		ctx, `
		INSERT INTO audit_logs (
			actor_user_id,
			action,
			entity_type,
			entity_id,
			metadata
		)
		VALUES (
			$1::uuid,
			'SUPERVISOR_REQUEST_CREATED',
			'supervisor_requests',
			$2::uuid,
			jsonb_build_object('request_number', $3)
		)
	`, studentUserID, req.ID, req.RequestNumber,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(
		ctx, `
		INSERT INTO outbox_events (
			aggregate_id,
			aggregate_type,
			event_type,
			payload
		)
		VALUES (
			$1::uuid,
			'supervisor_requests',
			'supervisor_request.created',
			jsonb_build_object(
				'request_id', $1::text,
				'request_number', $2,
				'student_user_id', $3,
				'status', 'SUBMITTED',
				'topic_title', $4
			)
		)
	`, req.ID, req.RequestNumber, req.StudentUserID, req.TopicTitle,
	)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.GetSupervisorRequestByID(ctx, req.ID)
}

func (r *SupervisorRepository) GetSupervisorRequestByID(
	ctx context.Context,
	requestID string,
) (*model.SupervisorRequest, error) {
	var req model.SupervisorRequest

	err := r.db.QueryRow(
		ctx, `
		SELECT
			sr.id::text,
			sr.request_number,
			sr.student_user_id::text,
			sr.topic_title,
			sr.topic_description,
			sr.status,
			COALESCE(l.id::text, ''),
			COALESCE(l.full_name, ''),
			sr.created_at,
			sr.updated_at
		FROM supervisor_requests sr
		LEFT JOIN supervisor_assignments sa ON sa.request_id = sr.id
		LEFT JOIN lecturers l ON l.id = sa.lecturer_id
		WHERE sr.id = $1::uuid
		ORDER BY sa.created_at DESC
		LIMIT 1
	`, requestID,
	).Scan(
		&req.ID,
		&req.RequestNumber,
		&req.StudentUserID,
		&req.TopicTitle,
		&req.TopicDescription,
		&req.Status,
		&req.AssignedLecturerID,
		&req.AssignedLecturerName,
		&req.CreatedAt,
		&req.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrSupervisorRequestNotFound
	}
	if err != nil {
		return nil, err
	}

	choices, err := r.listChoices(ctx, req.ID)
	if err != nil {
		return nil, err
	}

	req.Choices = choices

	return &req, nil
}

func (r *SupervisorRepository) ListAllSupervisorRequests(
	ctx context.Context,
	statusFilter string,
) ([]model.SupervisorRequest, error) {
	query := `
		SELECT id::text
		FROM supervisor_requests
	`
	args := []interface{}{}

	if statusFilter != "" {
		query += " WHERE status = $1"
		args = append(args, statusFilter)
	}

	query += " ORDER BY created_at DESC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []model.SupervisorRequest

	for rows.Next() {
		var requestID string
		if err := rows.Scan(&requestID); err != nil {
			return nil, err
		}

		req, err := r.GetSupervisorRequestByID(ctx, requestID)
		if err != nil {
			return nil, err
		}

		requests = append(requests, *req)
	}

	return requests, rows.Err()
}

func (r *SupervisorRepository) ListByStudentUserID(
	ctx context.Context,
	studentUserID string,
) ([]model.SupervisorRequest, error) {
	rows, err := r.db.Query(
		ctx, `
		SELECT id::text
		FROM supervisor_requests
		WHERE student_user_id = $1::uuid
		ORDER BY created_at DESC
	`, studentUserID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []model.SupervisorRequest

	for rows.Next() {
		var requestID string
		if err := rows.Scan(&requestID); err != nil {
			return nil, err
		}

		req, err := r.GetSupervisorRequestByID(ctx, requestID)
		if err != nil {
			return nil, err
		}

		requests = append(requests, *req)
	}

	return requests, rows.Err()
}

func (r *SupervisorRepository) ListByLecturerUserID(
	ctx context.Context,
	lecturerUserID string,
) ([]model.SupervisorRequest, error) {
	rows, err := r.db.Query(
		ctx, `
		SELECT sr.id::text
		FROM supervisor_requests sr
		JOIN supervisor_assignments sa ON sa.request_id = sr.id
		JOIN lecturers l ON l.id = sa.lecturer_id
		WHERE l.user_id = $1::uuid
		ORDER BY sr.created_at DESC
	`, lecturerUserID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []model.SupervisorRequest

	for rows.Next() {
		var requestID string
		if err := rows.Scan(&requestID); err != nil {
			return nil, err
		}

		req, err := r.GetSupervisorRequestByID(ctx, requestID)
		if err != nil {
			return nil, err
		}

		requests = append(requests, *req)
	}

	return requests, rows.Err()
}

func (r *SupervisorRepository) VerifySupervisorRequest(
	ctx context.Context,
	requestID string,
	actorUserID string,
	note string,
) (*model.SupervisorRequest, error) {
	return r.updateSupervisorStatus(
		ctx,
		requestID,
		actorUserID,
		"SUPERVISOR_REQUEST_VERIFIED",
		"VERIFIED",
		[]string{"SUBMITTED"},
		note,
	)
}

func (r *SupervisorRepository) AssignSupervisor(
	ctx context.Context,
	requestID string,
	actorUserID string,
	lecturerID string,
	note string,
) (*model.SupervisorRequest, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var currentStatus string
	var studentUserID string
	var requestNumber string

	err = tx.QueryRow(
		ctx, `
		SELECT status, student_user_id::text, request_number
		FROM supervisor_requests
		WHERE id = $1::uuid
		FOR UPDATE
	`, requestID,
	).Scan(&currentStatus, &studentUserID, &requestNumber)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrSupervisorRequestNotFound
	}
	if err != nil {
		return nil, err
	}

	if currentStatus != "VERIFIED" {
		return nil, ErrInvalidStatusTransition
	}

	var lecturerExists bool
	err = tx.QueryRow(
		ctx, `
		SELECT EXISTS (
			SELECT 1 FROM lecturers
			WHERE id = $1::uuid
			  AND status = 'ACTIVE'
		)
	`, lecturerID,
	).Scan(&lecturerExists)
	if err != nil {
		return nil, err
	}

	if !lecturerExists {
		return nil, ErrLecturerNotFound
	}

	_, err = tx.Exec(
		ctx, `
		INSERT INTO supervisor_assignments (
			request_id,
			lecturer_id,
			assigned_by_user_id,
			status,
			note
		)
		VALUES ($1::uuid, $2::uuid, $3::uuid, 'PENDING', $4)
	`, requestID, lecturerID, actorUserID, note,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(
		ctx, `
		UPDATE supervisor_requests
		SET status = 'ASSIGNED',
		    assigned_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1::uuid
	`, requestID,
	)
	if err != nil {
		return nil, err
	}

	if err := r.insertSupervisorHistory(ctx, tx, requestID, currentStatus, "ASSIGNED", actorUserID, note); err != nil {
		return nil, err
	}

	if err := r.insertSupervisorOutbox(
		ctx,
		tx,
		requestID,
		requestNumber,
		studentUserID,
		"supervisor_request.assigned",
		"ASSIGNED",
		actorUserID,
		note,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.GetSupervisorRequestByID(ctx, requestID)
}

func (r *SupervisorRepository) AcceptSupervisorRequest(
	ctx context.Context,
	requestID string,
	lecturerUserID string,
	note string,
) (*model.SupervisorRequest, error) {
	return r.respondSupervisorAssignment(ctx, requestID, lecturerUserID, "ACCEPTED", "supervisor_request.accepted", note)
}

func (r *SupervisorRepository) RejectSupervisorRequest(
	ctx context.Context,
	requestID string,
	lecturerUserID string,
	note string,
) (*model.SupervisorRequest, error) {
	return r.respondSupervisorAssignment(ctx, requestID, lecturerUserID, "REJECTED", "supervisor_request.rejected", note)
}

func (r *SupervisorRepository) respondSupervisorAssignment(
	ctx context.Context,
	requestID string,
	lecturerUserID string,
	targetStatus string,
	eventType string,
	note string,
) (*model.SupervisorRequest, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var currentStatus string
	var studentUserID string
	var requestNumber string
	var assignmentID string

	err = tx.QueryRow(
		ctx, `
		SELECT
			sr.status,
			sr.student_user_id::text,
			sr.request_number,
			sa.id::text
		FROM supervisor_requests sr
		JOIN supervisor_assignments sa ON sa.request_id = sr.id
		JOIN lecturers l ON l.id = sa.lecturer_id
		WHERE sr.id = $1::uuid
		  AND l.user_id = $2::uuid
		  AND sa.status = 'PENDING'
		ORDER BY sa.created_at DESC
		LIMIT 1
		FOR UPDATE
	`, requestID, lecturerUserID,
	).Scan(&currentStatus, &studentUserID, &requestNumber, &assignmentID)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrLecturerNotAssigned
	}
	if err != nil {
		return nil, err
	}

	if currentStatus != "ASSIGNED" {
		return nil, ErrInvalidStatusTransition
	}

	_, err = tx.Exec(
		ctx, `
		UPDATE supervisor_assignments
		SET status = $1,
		    note = $2,
		    updated_at = NOW()
		WHERE id = $3::uuid
	`, targetStatus, note, assignmentID,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(
		ctx, `
		UPDATE supervisor_requests
		SET status = $1,
		    accepted_at = CASE WHEN $1 = 'ACCEPTED' THEN NOW() ELSE accepted_at END,
		    rejected_at = CASE WHEN $1 = 'REJECTED' THEN NOW() ELSE rejected_at END,
		    updated_at = NOW()
		WHERE id = $2::uuid
	`, targetStatus, requestID,
	)
	if err != nil {
		return nil, err
	}

	if err := r.insertSupervisorHistory(
		ctx,
		tx,
		requestID,
		currentStatus,
		targetStatus,
		lecturerUserID,
		note,
	); err != nil {
		return nil, err
	}

	if err := r.insertSupervisorOutbox(
		ctx,
		tx,
		requestID,
		requestNumber,
		studentUserID,
		eventType,
		targetStatus,
		lecturerUserID,
		note,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.GetSupervisorRequestByID(ctx, requestID)
}

func (r *SupervisorRepository) updateSupervisorStatus(
	ctx context.Context,
	requestID string,
	actorUserID string,
	action string,
	targetStatus string,
	allowedStatuses []string,
	note string,
) (*model.SupervisorRequest, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var currentStatus string
	var studentUserID string
	var requestNumber string

	err = tx.QueryRow(
		ctx, `
		SELECT status, student_user_id::text, request_number
		FROM supervisor_requests
		WHERE id = $1::uuid
		FOR UPDATE
	`, requestID,
	).Scan(&currentStatus, &studentUserID, &requestNumber)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrSupervisorRequestNotFound
	}
	if err != nil {
		return nil, err
	}

	if !isStatusAllowed(currentStatus, allowedStatuses) {
		return nil, ErrInvalidStatusTransition
	}

	_, err = tx.Exec(
		ctx, `
		UPDATE supervisor_requests
		SET status = $1,
		    verified_at = CASE WHEN $1 = 'VERIFIED' THEN NOW() ELSE verified_at END,
		    updated_at = NOW()
		WHERE id = $2::uuid
	`, targetStatus, requestID,
	)
	if err != nil {
		return nil, err
	}

	if err := r.insertSupervisorHistory(ctx, tx, requestID, currentStatus, targetStatus, actorUserID, note); err != nil {
		return nil, err
	}

	eventType := "supervisor_request.verified"
	if err := r.insertSupervisorOutbox(
		ctx,
		tx,
		requestID,
		requestNumber,
		studentUserID,
		eventType,
		targetStatus,
		actorUserID,
		note,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.GetSupervisorRequestByID(ctx, requestID)
}

func (r *SupervisorRepository) listChoices(ctx context.Context, requestID string) ([]model.SupervisorChoice, error) {
	rows, err := r.db.Query(
		ctx, `
		SELECT
			l.id::text,
			l.full_name,
			src.priority
		FROM supervisor_request_choices src
		JOIN lecturers l ON l.id = src.lecturer_id
		WHERE src.request_id = $1::uuid
		ORDER BY src.priority ASC
	`, requestID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var choices []model.SupervisorChoice

	for rows.Next() {
		var choice model.SupervisorChoice
		if err := rows.Scan(&choice.LecturerID, &choice.LecturerName, &choice.Priority); err != nil {
			return nil, err
		}

		choices = append(choices, choice)
	}

	return choices, rows.Err()
}

type txExecutor interface {
	Exec(ctx context.Context, sql string, arguments ...interface{}) (pgconn.CommandTag, error)
}

func (r *SupervisorRepository) insertSupervisorHistory(
	ctx context.Context,
	tx txExecutor,
	requestID string,
	oldStatus string,
	newStatus string,
	actorUserID string,
	note string,
) error {
	_, err := tx.Exec(
		ctx, `
		INSERT INTO supervisor_status_histories (
			request_id,
			old_status,
			new_status,
			actor_user_id,
			note
		)
		VALUES ($1::uuid, $2, $3, $4::uuid, $5)
	`, requestID, oldStatus, newStatus, actorUserID, note,
	)

	return err
}

func (r *SupervisorRepository) insertSupervisorOutbox(
	ctx context.Context,
	tx txExecutor,
	requestID string,
	requestNumber string,
	studentUserID string,
	eventType string,
	status string,
	actorUserID string,
	note string,
) error {
	_, err := tx.Exec(
		ctx, `
		INSERT INTO outbox_events (
			aggregate_id,
			aggregate_type,
			event_type,
			payload
		)
		VALUES (
			$1::uuid,
			'supervisor_requests',
			$2,
			jsonb_build_object(
				'request_id', $1::text,
				'request_number', $3,
				'student_user_id', $4,
				'status', $5,
				'actor_user_id', $6,
				'note', $7
			)
		)
	`, requestID, eventType, requestNumber, studentUserID, status, actorUserID, note,
	)

	return err
}

func generateSupervisorRequestNumber() string {
	now := time.Now()
	return fmt.Sprintf("CF-SPV-%s-%04d", now.Format("20060102150405"), now.UnixNano()%10000)
}
