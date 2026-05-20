package repository

import (
	"context"

	"campus-flow/apps/services/reporting-service/internal/model"
)

func (r *ReportingRepository) GetAdminOperationalDashboard(
	ctx context.Context,
) (*model.AdminOperationalDashboard, error) {
	dashboard := &model.AdminOperationalDashboard{}

	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)::bigint FROM academic_request_snapshots WHERE status = 'SUBMITTED'
	`).Scan(&dashboard.PendingVerificationCount)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*)::bigint FROM academic_request_snapshots
		WHERE due_at IS NOT NULL
		  AND due_at > NOW()
		  AND due_at <= NOW() + INTERVAL '24 hours'
		  AND status NOT IN ('COMPLETED', 'REJECTED', 'CANCELLED')
	`).Scan(&dashboard.SLAAtRiskCount)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*)::bigint FROM academic_request_snapshots
		WHERE due_at IS NOT NULL
		  AND due_at < NOW()
		  AND status NOT IN ('COMPLETED', 'REJECTED', 'CANCELLED')
	`).Scan(&dashboard.SLABreachedCount)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT COALESCE(
			EXTRACT(EPOCH FROM AVG(verified_at - submitted_at)) / 3600.0,
			0
		)
		FROM academic_request_snapshots
		WHERE verified_at IS NOT NULL AND submitted_at IS NOT NULL
	`).Scan(&dashboard.AvgVerificationTimeHours)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*)::bigint FROM academic_request_snapshots
		WHERE verified_at IS NOT NULL
		  AND verified_at >= date_trunc('week', NOW())
	`).Scan(&dashboard.WeeklyThroughput)
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT d::date::text, COALESCE(c, 0)::bigint
		FROM generate_series(
			(NOW() - INTERVAL '6 days')::date,
			NOW()::date,
			'1 day'
		) AS d
		LEFT JOIN (
			SELECT created_at::date AS day, COUNT(*) AS c
			FROM academic_request_snapshots
			WHERE created_at >= (NOW() - INTERVAL '6 days')::date
			GROUP BY created_at::date
		) sub ON sub.day = d::date
		ORDER BY d
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var dc model.DailyCount
		if err := rows.Scan(&dc.Date, &dc.Count); err != nil {
			return nil, err
		}
		dashboard.RequestsByDay = append(dashboard.RequestsByDay, dc)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return dashboard, nil
}

func (r *ReportingRepository) GetSLAAtRiskRequests(
	ctx context.Context,
	limit int32,
) ([]model.SLAAtRiskItem, error) {
	if limit <= 0 {
		limit = 10
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			request_id::text,
			request_number,
			COALESCE(title, ''),
			student_user_id::text,
			status,
			due_at::text,
			created_at::text,
			EXTRACT(EPOCH FROM (due_at - NOW())) / 3600.0 AS hours_remaining
		FROM academic_request_snapshots
		WHERE due_at IS NOT NULL
		  AND status NOT IN ('COMPLETED', 'REJECTED', 'CANCELLED')
		ORDER BY due_at ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.SLAAtRiskItem
	for rows.Next() {
		var item model.SLAAtRiskItem
		if err := rows.Scan(
			&item.RequestID,
			&item.RequestNumber,
			&item.Title,
			&item.StudentUserID,
			&item.Status,
			&item.DueAt,
			&item.CreatedAt,
			&item.HoursRemaining,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
