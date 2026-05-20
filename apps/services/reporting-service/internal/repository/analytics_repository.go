package repository

import (
	"context"
	"strings"

	"campus-flow/apps/services/reporting-service/internal/model"
)

func (r *ReportingRepository) GetRequestTrends(
	ctx context.Context,
	startDate, endDate, granularity string,
) ([]model.TrendDataPoint, error) {
	dateTrunc := "month"
	switch strings.ToUpper(granularity) {
	case "DAILY":
		dateTrunc = "day"
	case "WEEKLY":
		dateTrunc = "week"
	case "MONTHLY":
		dateTrunc = "month"
	}

	query := `
		SELECT
			date_trunc('` + dateTrunc + `', created_at)::date::text AS period,
			COUNT(*) FILTER (WHERE status = 'SUBMITTED')::bigint,
			COUNT(*) FILTER (WHERE status = 'VERIFIED')::bigint,
			COUNT(*) FILTER (WHERE status = 'APPROVED')::bigint,
			COUNT(*) FILTER (WHERE status = 'COMPLETED')::bigint,
			COUNT(*) FILTER (WHERE status = 'REJECTED')::bigint
		FROM academic_request_snapshots
		WHERE 1=1
	`

	args := []interface{}{}
	argIdx := 1

	if start := strings.TrimSpace(startDate); start != "" {
		query += " AND created_at >= $" + itoa(argIdx) + "::date"
		args = append(args, start)
		argIdx++
	}
	if end := strings.TrimSpace(endDate); end != "" {
		query += " AND created_at <= ($" + itoa(argIdx) + "::date + INTERVAL '1 day')"
		args = append(args, end)
		argIdx++
	}

	query += " GROUP BY period ORDER BY period ASC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []model.TrendDataPoint
	for rows.Next() {
		var p model.TrendDataPoint
		if err := rows.Scan(
			&p.Period,
			&p.SubmittedCount,
			&p.VerifiedCount,
			&p.ApprovedCount,
			&p.CompletedCount,
			&p.RejectedCount,
		); err != nil {
			return nil, err
		}
		points = append(points, p)
	}
	return points, rows.Err()
}

func (r *ReportingRepository) GetProcessingTimeReport(
	ctx context.Context,
	startDate, endDate string,
) (*model.ProcessingTimeReport, error) {
	query := `
		SELECT
			COALESCE(EXTRACT(EPOCH FROM AVG(verified_at - submitted_at)) / 3600.0, 0),
			COALESCE(EXTRACT(EPOCH FROM AVG(approved_at - verified_at)) / 3600.0, 0),
			COALESCE(EXTRACT(EPOCH FROM AVG(completed_at - approved_at)) / 3600.0, 0),
			COALESCE(EXTRACT(EPOCH FROM AVG(completed_at - submitted_at)) / 3600.0, 0),
			COALESCE(
				EXTRACT(EPOCH FROM PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY (completed_at - submitted_at))) / 3600.0,
				0
			)
		FROM academic_request_snapshots
		WHERE completed_at IS NOT NULL AND submitted_at IS NOT NULL
	`

	args := []interface{}{}
	argIdx := 1

	if start := strings.TrimSpace(startDate); start != "" {
		query += " AND created_at >= $" + itoa(argIdx) + "::date"
		args = append(args, start)
		argIdx++
	}
	if end := strings.TrimSpace(endDate); end != "" {
		query += " AND created_at <= ($" + itoa(argIdx) + "::date + INTERVAL '1 day')"
		args = append(args, end)
		argIdx++
	}

	report := &model.ProcessingTimeReport{}
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&report.AvgSubmissionToVerificationHours,
		&report.AvgVerificationToApprovalHours,
		&report.AvgApprovalToCompletionHours,
		&report.AvgTotalProcessingHours,
		&report.P90TotalHours,
	)
	if err != nil {
		return nil, err
	}
	return report, nil
}
