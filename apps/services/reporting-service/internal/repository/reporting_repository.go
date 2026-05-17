package repository

import (
	"context"
	"strings"

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

// buildPeriodFilter returns a WHERE fragment + arg slice for created_at >= ?
// AND created_at <= ? based on the provided filter. Returns empty string if
// no dates were given.
func buildPeriodFilter(filter model.DashboardFilter, baseArgs []interface{}) (string, []interface{}) {
	conds := []string{}
	args := baseArgs

	if start := strings.TrimSpace(filter.StartDate); start != "" {
		args = append(args, start)
		conds = append(conds, "created_at >= $"+itoa(len(args))+"::date")
	}
	if end := strings.TrimSpace(filter.EndDate); end != "" {
		args = append(args, end)
		conds = append(conds, "created_at <= ($"+itoa(len(args))+"::date + INTERVAL '1 day')")
	}

	if len(conds) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(conds, " AND "), args
}

func (r *ReportingRepository) GetAcademicDashboard(
	ctx context.Context,
	filter model.DashboardFilter,
) (*model.AcademicDashboard, error) {
	whereClause, args := buildPeriodFilter(filter, nil)

	rows, err := r.db.Query(ctx, `
		SELECT status, COUNT(*)::bigint
		FROM academic_request_snapshots
	`+whereClause+`
		GROUP BY status
		ORDER BY status ASC
	`, args...)
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
	filter model.DashboardFilter,
) (*model.SupervisorDashboard, error) {
	whereClause, args := buildPeriodFilter(filter, nil)

	rows, err := r.db.Query(ctx, `
		SELECT status, COUNT(*)::bigint
		FROM supervisor_request_snapshots
	`+whereClause+`
		GROUP BY status
		ORDER BY status ASC
	`, args...)
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

// GetLecturerWorkload aggregates supervisor snapshots by lecturer. Only rows
// where lecturer_id is set are considered; this excludes early-stage
// supervisor requests that haven't been assigned yet.
func (r *ReportingRepository) GetLecturerWorkload(
	ctx context.Context,
) ([]model.LecturerWorkloadItem, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			lecturer_id::text,
			COALESCE(lecturer_user_id::text, ''),
			COALESCE(lecturer_name, ''),
			COUNT(*) FILTER (WHERE status IN ('ASSIGNED', 'ACCEPTED', 'COMPLETED'))::bigint AS active_count,
			COUNT(*) FILTER (WHERE status = 'ASSIGNED')::bigint AS assigned_count,
			COUNT(*) FILTER (WHERE status = 'ACCEPTED')::bigint AS accepted_count,
			COUNT(*) FILTER (WHERE status = 'COMPLETED')::bigint AS completed_count,
			COUNT(*) FILTER (WHERE status = 'REJECTED')::bigint AS rejected_count
		FROM supervisor_request_snapshots
		WHERE lecturer_id IS NOT NULL
		GROUP BY lecturer_id, lecturer_user_id, lecturer_name
		ORDER BY active_count DESC, lecturer_name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.LecturerWorkloadItem
	for rows.Next() {
		var item model.LecturerWorkloadItem
		if err := rows.Scan(
			&item.LecturerID,
			&item.LecturerUserID,
			&item.LecturerName,
			&item.ActiveCount,
			&item.AssignedCount,
			&item.AcceptedCount,
			&item.CompletedCount,
			&item.RejectedCount,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *ReportingRepository) UpsertSupervisorRequestSnapshot(
	ctx context.Context,
	snapshot model.SupervisorRequestSnapshot,
) error {
	var lecturerArg interface{}
	if snapshot.LecturerID == "" {
		lecturerArg = nil
	} else {
		lecturerArg = snapshot.LecturerID
	}

	var lecturerUserArg interface{}
	if snapshot.LecturerUserID == "" {
		lecturerUserArg = nil
	} else {
		lecturerUserArg = snapshot.LecturerUserID
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO supervisor_request_snapshots (
			request_id,
			request_number,
			student_user_id,
			topic_title,
			status,
			lecturer_id,
			lecturer_user_id,
			source_event_id,
			source_event_type
		)
		VALUES (
			$1::uuid,
			$2,
			$3::uuid,
			$4,
			$5,
			NULLIF($6, '')::uuid,
			NULLIF($7, '')::uuid,
			$8::uuid,
			$9
		)
		ON CONFLICT (request_id)
		DO UPDATE SET
			request_number = EXCLUDED.request_number,
			student_user_id = EXCLUDED.student_user_id,
			topic_title = COALESCE(NULLIF(EXCLUDED.topic_title, ''), supervisor_request_snapshots.topic_title),
			status = EXCLUDED.status,
			lecturer_id = COALESCE(EXCLUDED.lecturer_id, supervisor_request_snapshots.lecturer_id),
			lecturer_user_id = COALESCE(EXCLUDED.lecturer_user_id, supervisor_request_snapshots.lecturer_user_id),
			source_event_id = EXCLUDED.source_event_id,
			source_event_type = EXCLUDED.source_event_type,
			updated_at = NOW(),
			projected_at = NOW()
	`, snapshot.RequestID,
		snapshot.RequestNumber,
		snapshot.StudentUserID,
		snapshot.TopicTitle,
		snapshot.Status,
		lecturerArg,
		lecturerUserArg,
		snapshot.SourceEventID,
		snapshot.SourceEventType,
	)

	return err
}
