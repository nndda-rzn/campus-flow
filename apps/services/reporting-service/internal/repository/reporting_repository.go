package repository

import (
	"context"

	"campus-flow/apps/services/reporting-service/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ReportingRepository struct {
	db *pgxpool.Pool
}

func NewReportingRepository(db *pgxpool.Pool) *ReportingRepository {
	return &ReportingRepository{
		db: db,
	}
}

func (r *ReportingRepository) SaveInboxEvent(
	ctx context.Context,
	eventID string,
	eventType string,
	payload []byte,
) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		INSERT INTO inbox_events (
			event_id,
			event_type,
			payload
		)
		VALUES ($1::uuid, $2, $3::jsonb)
		ON CONFLICT (event_id) DO NOTHING
	`, eventID, eventType, string(payload))
	if err != nil {
		return false, err
	}

	return tag.RowsAffected() > 0, nil
}

func (r *ReportingRepository) MarkInboxEventProcessed(
	ctx context.Context,
	eventID string,
) error {
	_, err := r.db.Exec(ctx, `
		UPDATE inbox_events
		SET processed_at = NOW()
		WHERE event_id = $1::uuid
	`, eventID)

	return err
}

func (r *ReportingRepository) UpsertAcademicRequestSnapshot(
	ctx context.Context,
	snapshot model.AcademicRequestSnapshot,
) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO academic_request_snapshots (
			request_id,
			request_number,
			student_user_id,
			service_code,
			service_name,
			title,
			status,
			source_event_id,
			source_event_type
		)
		VALUES (
			$1::uuid,
			$2,
			$3::uuid,
			$4,
			$5,
			$6,
			$7,
			$8::uuid,
			$9
		)
		ON CONFLICT (request_id)
		DO UPDATE SET
			request_number = EXCLUDED.request_number,
			student_user_id = EXCLUDED.student_user_id,
			service_code = COALESCE(NULLIF(EXCLUDED.service_code, ''), academic_request_snapshots.service_code),
			service_name = COALESCE(NULLIF(EXCLUDED.service_name, ''), academic_request_snapshots.service_name),
			title = COALESCE(NULLIF(EXCLUDED.title, ''), academic_request_snapshots.title),
			status = EXCLUDED.status,
			source_event_id = EXCLUDED.source_event_id,
			source_event_type = EXCLUDED.source_event_type,
			updated_at = NOW(),
			projected_at = NOW()
	`, snapshot.RequestID,
		snapshot.RequestNumber,
		snapshot.StudentUserID,
		snapshot.ServiceCode,
		snapshot.ServiceName,
		snapshot.Title,
		snapshot.Status,
		snapshot.SourceEventID,
		snapshot.SourceEventType,
	)

	return err
}

func (r *ReportingRepository) GetAcademicDashboard(
	ctx context.Context,
) (*model.AcademicDashboard, error) {
	rows, err := r.db.Query(ctx, `
		SELECT status, COUNT(*)::bigint
		FROM academic_request_snapshots
		GROUP BY status
		ORDER BY status ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dashboard := &model.AcademicDashboard{
		StatusCounts: []model.StatusCount{},
	}

	for rows.Next() {
		var status string
		var total int64

		if err := rows.Scan(&status, &total); err != nil {
			return nil, err
		}

		dashboard.TotalRequests += total
		dashboard.StatusCounts = append(dashboard.StatusCounts, model.StatusCount{
			Status: status,
			Total:  total,
		})

		switch status {
		case "SUBMITTED":
			dashboard.SubmittedRequests = total
		case "VERIFIED":
			dashboard.VerifiedRequests = total
		case "APPROVED":
			dashboard.ApprovedRequests = total
		case "REJECTED":
			dashboard.RejectedRequests = total
		case "COMPLETED":
			dashboard.CompletedRequests = total
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return dashboard, nil
}

func (r *ReportingRepository) GetSupervisorDashboard(
	ctx context.Context,
) (*model.SupervisorDashboard, error) {
	rows, err := r.db.Query(ctx, `
		SELECT status, COUNT(*)::bigint
		FROM supervisor_request_snapshots
		GROUP BY status
		ORDER BY status ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dashboard := &model.SupervisorDashboard{
		StatusCounts: []model.StatusCount{},
	}

	for rows.Next() {
		var status string
		var total int64

		if err := rows.Scan(&status, &total); err != nil {
			return nil, err
		}

		dashboard.TotalRequests += total
		dashboard.StatusCounts = append(dashboard.StatusCounts, model.StatusCount{
			Status: status,
			Total:  total,
		})

		switch status {
		case "SUBMITTED":
			dashboard.SubmittedRequests = total
		case "VERIFIED":
			dashboard.VerifiedRequests = total
		case "ASSIGNED":
			dashboard.AssignedRequests = total
		case "ACCEPTED":
			dashboard.AcceptedRequests = total
		case "REJECTED":
			dashboard.RejectedRequests = total
		case "COMPLETED":
			dashboard.CompletedRequests = total
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return dashboard, nil
}

func (r *ReportingRepository) UpsertSupervisorRequestSnapshot(
	ctx context.Context,
	snapshot model.SupervisorRequestSnapshot,
) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO supervisor_request_snapshots (
			request_id,
			request_number,
			student_user_id,
			topic_title,
			status,
			source_event_id,
			source_event_type
		)
		VALUES (
			$1::uuid,
			$2,
			$3::uuid,
			$4,
			$5,
			$6::uuid,
			$7
		)
		ON CONFLICT (request_id)
		DO UPDATE SET
			request_number = EXCLUDED.request_number,
			student_user_id = EXCLUDED.student_user_id,
			topic_title = COALESCE(NULLIF(EXCLUDED.topic_title, ''), supervisor_request_snapshots.topic_title),
			status = EXCLUDED.status,
			source_event_id = EXCLUDED.source_event_id,
			source_event_type = EXCLUDED.source_event_type,
			updated_at = NOW(),
			projected_at = NOW()
	`, snapshot.RequestID,
		snapshot.RequestNumber,
		snapshot.StudentUserID,
		snapshot.TopicTitle,
		snapshot.Status,
		snapshot.SourceEventID,
		snapshot.SourceEventType,
	)

	return err
}
