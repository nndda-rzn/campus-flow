package repository

import (
	"context"
	"strings"
)

type ThesisOverviewItem struct {
	StudentUserID          string
	StudentName            string
	NIM                    string
	TopicTitle             string
	LecturerName           string
	CurrentMilestone       string
	CompletionPercentage   int32
	DaysSinceLastActivity  int32
	IsStuck                bool
	SupervisorRequestID    string
}

type ThesisOverviewSummary struct {
	Items      []ThesisOverviewItem
	Total      int32
	OnTrack    int32
	Behind     int32
	NotStarted int32
}

func (r *ThesisRepository) ListDepartmentThesisOverview(ctx context.Context, departmentID string, stuckOnly bool, search string) (*ThesisOverviewSummary, error) {
	query := `
		WITH supervised AS (
			SELECT
				sr.id AS supervisor_request_id,
				sr.student_user_id,
				s.full_name AS student_name,
				s.nim,
				sr.topic_title,
				l.full_name AS lecturer_name,
				s.department_id
			FROM supervisor_requests sr
			JOIN students s ON s.user_id = sr.student_user_id
			JOIN supervisor_assignments sa ON sa.supervisor_request_id = sr.id
			JOIN lecturers l ON l.id = sa.lecturer_id
			WHERE sa.status = 'ACCEPTED'
		),
		progress_data AS (
			SELECT
				sup.supervisor_request_id,
				sup.student_user_id,
				sup.student_name,
				sup.nim,
				sup.topic_title,
				sup.lecturer_name,
				COALESCE(tm.name, 'Belum Mulai') AS current_milestone,
				COALESCE(
					(SELECT COUNT(*) FILTER (WHERE tp.status = 'COMPLETED')::int * 100 /
						NULLIF((SELECT COUNT(*) FROM thesis_milestones WHERE department_id = sup.department_id AND is_active = true)::int, 0)
					, 0
				) AS completion_percentage,
				COALESCE(
					EXTRACT(DAY FROM NOW() - GREATEST(
						(SELECT MAX(tp2.updated_at) FROM thesis_progress tp2 WHERE tp2.student_user_id = sup.student_user_id),
						(SELECT MAX(gl.created_at) FROM guidance_logs gl WHERE gl.student_user_id = sup.student_user_id)
					))::int,
					999
				) AS days_since_last_activity
			FROM supervised sup
			LEFT JOIN LATERAL (
				SELECT tp.milestone_id
				FROM thesis_progress tp
				WHERE tp.student_user_id = sup.student_user_id AND tp.status = 'IN_PROGRESS'
				ORDER BY tp.created_at DESC
				LIMIT 1
			) latest_progress ON true
			LEFT JOIN thesis_milestones tm ON tm.id = latest_progress.milestone_id
			LEFT JOIN thesis_progress tp ON tp.student_user_id = sup.student_user_id
			WHERE ($1 = '' OR sup.department_id = $1::uuid)
		)
		SELECT DISTINCT ON (student_user_id)
			supervisor_request_id,
			student_user_id,
			student_name,
			nim,
			topic_title,
			lecturer_name,
			current_milestone,
			completion_percentage,
			days_since_last_activity,
			(days_since_last_activity > 14) AS is_stuck
		FROM progress_data
		WHERE 1=1
	`

	args := []interface{}{departmentID}
	argIdx := 2

	if search != "" {
		query += ` AND (LOWER(student_name) LIKE $` + itoa(argIdx) + ` OR LOWER(nim) LIKE $` + itoa(argIdx) + `)`
		args = append(args, "%"+strings.ToLower(search)+"%")
		argIdx++
	}

	if stuckOnly {
		query += ` AND days_since_last_activity > 14`
	}

	query += ` ORDER BY student_user_id, days_since_last_activity DESC`

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summary := &ThesisOverviewSummary{}
	for rows.Next() {
		var item ThesisOverviewItem
		if err := rows.Scan(
			&item.SupervisorRequestID,
			&item.StudentUserID,
			&item.StudentName,
			&item.NIM,
			&item.TopicTitle,
			&item.LecturerName,
			&item.CurrentMilestone,
			&item.CompletionPercentage,
			&item.DaysSinceLastActivity,
			&item.IsStuck,
		); err != nil {
			return nil, err
		}
		summary.Items = append(summary.Items, item)
		summary.Total++

		if item.CompletionPercentage == 0 {
			summary.NotStarted++
		} else if item.IsStuck {
			summary.Behind++
		} else {
			summary.OnTrack++
		}
	}

	return summary, rows.Err()
}
