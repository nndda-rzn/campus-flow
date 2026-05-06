package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"campus-flow/apps/services/academic-service/internal/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrAcademicServiceNotFound = errors.New("academic service not found")
	ErrAcademicRequestNotFound = errors.New("academic request not found")
	ErrInvalidStatusTransition = errors.New("invalid status transition")
)

type AcademicRepository struct {
	db *pgxpool.Pool
}

func NewAcademicRepository(db *pgxpool.Pool) *AcademicRepository {
	return &AcademicRepository{
		db: db,
	}
}

func (r *AcademicRepository) ListAcademicServices(ctx context.Context) ([]model.AcademicServiceItem, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id::text, code, name, description, is_active
		FROM academic_services
		WHERE is_active = TRUE
		ORDER BY name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []model.AcademicServiceItem

	for rows.Next() {
		var item model.AcademicServiceItem

		if err := rows.Scan(
			&item.ID,
			&item.Code,
			&item.Name,
			&item.Description,
			&item.IsActive,
		); err != nil {
			return nil, err
		}

		services = append(services, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return services, nil
}

func (r *AcademicRepository) CreateAcademicRequest(
	ctx context.Context,
	studentUserID string,
	serviceCode string,
	title string,
	description string,
) (*model.AcademicRequest, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var svc model.AcademicServiceItem

	err = tx.QueryRow(ctx, `
		SELECT id::text, code, name, description, is_active
		FROM academic_services
		WHERE code = $1
		  AND is_active = TRUE
		LIMIT 1
	`, serviceCode).Scan(
		&svc.ID,
		&svc.Code,
		&svc.Name,
		&svc.Description,
		&svc.IsActive,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrAcademicServiceNotFound
	}

	if err != nil {
		return nil, err
	}

	requestNumber := generateRequestNumber()

	var req model.AcademicRequest

	err = tx.QueryRow(ctx, `
		INSERT INTO service_requests (
			request_number,
			student_user_id,
			academic_service_id,
			title,
			description,
			status,
			submitted_at
		)
		VALUES ($1, $2::uuid, $3::uuid, $4, $5, 'SUBMITTED', NOW())
		RETURNING 
			id::text,
			request_number,
			student_user_id::text,
			academic_service_id::text,
			title,
			description,
			status,
			created_at,
			updated_at
	`, requestNumber, studentUserID, svc.ID, title, description).Scan(
		&req.ID,
		&req.RequestNumber,
		&req.StudentUserID,
		&req.AcademicServiceID,
		&req.Title,
		&req.Description,
		&req.Status,
		&req.CreatedAt,
		&req.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	req.ServiceCode = svc.Code
	req.ServiceName = svc.Name

	_, err = tx.Exec(ctx, `
		INSERT INTO request_status_histories (
			request_id,
			old_status,
			new_status,
			actor_user_id,
			note
		)
		VALUES ($1::uuid, NULL, 'SUBMITTED', $2::uuid, 'Request submitted by student')
	`, req.ID, studentUserID)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO audit_logs (
			actor_user_id,
			action,
			entity_type,
			entity_id,
			metadata
		)
		VALUES (
			$1::uuid,
			'ACADEMIC_REQUEST_CREATED',
			'service_requests',
			$2::uuid,
			jsonb_build_object('request_number', $3, 'service_code', $4)
		)
	`, studentUserID, req.ID, req.RequestNumber, svc.Code)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
	INSERT INTO outbox_events (
		aggregate_id,
		aggregate_type,
		event_type,
		payload
	)
	VALUES (
		$1::uuid,
		'service_requests',
		'academic_request.created',
		jsonb_build_object(
			'request_id', $1::text,
			'request_number', $2,
			'student_user_id', $3,
			'status', $4,
			'service_code', $5,
			'service_name', $6,
			'title', $7
		)
	)
`, req.ID, req.RequestNumber, req.StudentUserID, req.Status, req.ServiceCode, req.ServiceName, req.Title)
if err != nil {
	return nil, err
}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &req, nil
}

func (r *AcademicRepository) GetAcademicRequestByID(
	ctx context.Context,
	requestID string,
) (*model.AcademicRequest, error) {
	var req model.AcademicRequest

	err := r.db.QueryRow(ctx, `
		SELECT 
			sr.id::text,
			sr.request_number,
			sr.student_user_id::text,
			sr.academic_service_id::text,
			acs.code,
			acs.name,
			sr.title,
			sr.description,
			sr.status,
			sr.created_at,
			sr.updated_at
		FROM service_requests sr
		JOIN academic_services acs ON acs.id = sr.academic_service_id
		WHERE sr.id = $1::uuid
		LIMIT 1
	`, requestID).Scan(
		&req.ID,
		&req.RequestNumber,
		&req.StudentUserID,
		&req.AcademicServiceID,
		&req.ServiceCode,
		&req.ServiceName,
		&req.Title,
		&req.Description,
		&req.Status,
		&req.CreatedAt,
		&req.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrAcademicRequestNotFound
	}

	if err != nil {
		return nil, err
	}

	return &req, nil
}

func (r *AcademicRepository) ListByStudentUserID(
	ctx context.Context,
	studentUserID string,
) ([]model.AcademicRequest, error) {
	rows, err := r.db.Query(ctx, `
		SELECT 
			sr.id::text,
			sr.request_number,
			sr.student_user_id::text,
			sr.academic_service_id::text,
			acs.code,
			acs.name,
			sr.title,
			sr.description,
			sr.status,
			sr.created_at,
			sr.updated_at
		FROM service_requests sr
		JOIN academic_services acs ON acs.id = sr.academic_service_id
		WHERE sr.student_user_id = $1::uuid
		ORDER BY sr.created_at DESC
	`, studentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []model.AcademicRequest

	for rows.Next() {
		var req model.AcademicRequest

		if err := rows.Scan(
			&req.ID,
			&req.RequestNumber,
			&req.StudentUserID,
			&req.AcademicServiceID,
			&req.ServiceCode,
			&req.ServiceName,
			&req.Title,
			&req.Description,
			&req.Status,
			&req.CreatedAt,
			&req.UpdatedAt,
		); err != nil {
			return nil, err
		}

		requests = append(requests, req)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return requests, nil
}

func generateRequestNumber() string {
	now := time.Now()
	return fmt.Sprintf("CF-REQ-%s-%04d", now.Format("20060102150405"), now.UnixNano()%10000)
}

func (r *AcademicRepository) UpdateAcademicRequestStatus(
	ctx context.Context,
	requestID string,
	actorUserID string,
	actorRole string,
	action string,
	targetStatus string,
	allowedCurrentStatuses []string,
	note string,
) (*model.AcademicRequest, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var currentStatus string
var studentUserID string
var requestNumber string

err = tx.QueryRow(ctx, `
	SELECT 
		status,
		student_user_id::text,
		request_number
	FROM service_requests
	WHERE id = $1::uuid
	FOR UPDATE
`, requestID).Scan(&currentStatus, &studentUserID, &requestNumber)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrAcademicRequestNotFound
	}

	if err != nil {
		return nil, err
	}

	if !isStatusAllowed(currentStatus, allowedCurrentStatuses) {
		return nil, ErrInvalidStatusTransition
	}

	_, err = tx.Exec(ctx, `
		UPDATE service_requests
		SET 
			status = $1,
			updated_at = NOW(),
			completed_at = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE completed_at END
		WHERE id = $2::uuid
	`, targetStatus, requestID)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO request_status_histories (
			request_id,
			old_status,
			new_status,
			actor_user_id,
			note
		)
		VALUES ($1::uuid, $2, $3, $4::uuid, $5)
	`, requestID, currentStatus, targetStatus, actorUserID, note)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO request_approvals (
			request_id,
			approver_user_id,
			approver_role,
			action,
			note
		)
		VALUES ($1::uuid, $2::uuid, $3, $4, $5)
	`, requestID, actorUserID, actorRole, action, note)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO audit_logs (
			actor_user_id,
			action,
			entity_type,
			entity_id,
			metadata
		)
		VALUES (
			$1::uuid,
			$2,
			'service_requests',
			$3::uuid,
			jsonb_build_object(
				'old_status', $4,
				'new_status', $5,
				'actor_role', $6
			)
		)
	`, actorUserID, action, requestID, currentStatus, targetStatus, actorRole)
	if err != nil {
		return nil, err
	}

		eventType := academicRequestEventType(targetStatus)

_, err = tx.Exec(ctx, `
	INSERT INTO outbox_events (
		aggregate_id,
		aggregate_type,
		event_type,
		payload
	)
	VALUES (
		$1::uuid,
		'service_requests',
		$2,
		jsonb_build_object(
			'request_id', $1::text,
			'request_number', $3,
			'student_user_id', $4,
			'old_status', $5,
			'status', $6,
			'actor_user_id', $7,
			'actor_role', $8,
			'note', $9
		)
	)
`, requestID, eventType, requestNumber, studentUserID, currentStatus, targetStatus, actorUserID, actorRole, note)
if err != nil {
	return nil, err
}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.GetAcademicRequestByID(ctx, requestID)
}

func isStatusAllowed(currentStatus string, allowedStatuses []string) bool {
	for _, status := range allowedStatuses {
		if currentStatus == status {
			return true
		}
	}

	return false
}

func academicRequestEventType(status string) string {
	switch status {
	case "VERIFIED":
		return "academic_request.verified"
	case "APPROVED":
		return "academic_request.approved"
	case "REJECTED":
		return "academic_request.rejected"
	case "COMPLETED":
		return "academic_request.completed"
	default:
		return "academic_request.updated"
	}
}