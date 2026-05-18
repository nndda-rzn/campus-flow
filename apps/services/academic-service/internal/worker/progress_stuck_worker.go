package worker

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// StartProgressStuckWorker scans for students with ACCEPTED/COMPLETED supervisor requests
// who haven't had any activity (thesis progress or guidance log) in >14 days.
func StartProgressStuckWorker(
	ctx context.Context,
	db *pgxpool.Pool,
	interval time.Duration,
) {
	if interval <= 0 {
		interval = 24 * time.Hour
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Printf("Progress stuck worker started (tick=%s)", interval)

	scanProgressStuckWarnings(ctx, db)

	for {
		select {
		case <-ctx.Done():
			log.Println("Progress stuck worker stopped")
			return
		case <-ticker.C:
			scanProgressStuckWarnings(ctx, db)
		}
	}
}

func scanProgressStuckWarnings(ctx context.Context, db *pgxpool.Pool) {
	scanCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	tx, err := db.Begin(scanCtx)
	if err != nil {
		log.Printf("progress-stuck: begin tx: %v", err)
		return
	}
	defer tx.Rollback(scanCtx)

	// CTE to find latest activity per student
	query := `
		WITH student_activity AS (
			SELECT 
				sr.id as request_id,
				sr.student_user_id,
				l.user_id as lecturer_user_id,
				s.full_name as student_name,
				l.full_name as lecturer_name,
				sr.topic_title,
				GREATEST(
					COALESCE((SELECT MAX(updated_at) FROM thesis_progress WHERE supervisor_request_id = sr.id), '2000-01-01'::timestamp),
					COALESCE((SELECT MAX(created_at) FROM guidance_logs WHERE supervisor_request_id = sr.id), '2000-01-01'::timestamp)
				) as last_activity_at
			FROM supervisor_requests sr
			JOIN supervisor_assignments sa ON sa.request_id = sr.id AND sa.is_current = true
			JOIN lecturers l ON l.id = sa.lecturer_id
			JOIN students s ON s.user_id = sr.student_user_id
			WHERE sr.status IN ('ACCEPTED', 'COMPLETED')
		)
		SELECT 
			request_id::text,
			student_user_id::text,
			lecturer_user_id::text,
			COALESCE(student_name, '') as student_name,
			COALESCE(lecturer_name, '') as lecturer_name,
			topic_title,
			EXTRACT(DAY FROM (NOW() - last_activity_at))::int as days_stuck
		FROM student_activity
		WHERE last_activity_at < NOW() - INTERVAL '14 days'
		  AND NOT EXISTS (
			SELECT 1 FROM thesis_stuck_warnings 
			WHERE student_user_id = student_activity.student_user_id 
			  AND warning_date > CURRENT_DATE - INTERVAL '7 days'
		  )
		LIMIT 50
	`

	rows, err := tx.Query(scanCtx, query)
	if err != nil {
		log.Printf("progress-stuck: select: %v", err)
		return
	}

	type pending struct {
		requestID, studentUserID, lecturerUserID string
		studentName, lecturerName, topicTitle    string
		daysStuck                                int
	}
	var items []pending
	for rows.Next() {
		var p pending
		if err := rows.Scan(
			&p.requestID, &p.studentUserID, &p.lecturerUserID,
			&p.studentName, &p.lecturerName, &p.topicTitle,
			&p.daysStuck,
		); err != nil {
			rows.Close()
			log.Printf("progress-stuck: scan: %v", err)
			return
		}
		items = append(items, p)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		log.Printf("progress-stuck: rows err: %v", err)
		return
	}

	if len(items) == 0 {
		_ = tx.Commit(scanCtx)
		return
	}

	for _, p := range items {
		// Log warning
		if _, err := tx.Exec(scanCtx, `
			INSERT INTO thesis_stuck_warnings (student_user_id, days_stuck, warning_date)
			VALUES ($1::uuid, $2, CURRENT_DATE)
		`, p.studentUserID, p.daysStuck); err != nil {
			log.Printf("progress-stuck: insert warning %s: %v", p.studentUserID, err)
			return
		}

		// Emit event
		if _, err := tx.Exec(scanCtx, `
			INSERT INTO outbox_events (
				aggregate_id, aggregate_type, event_type, payload
			)
			VALUES (
				$1::uuid,
				'supervisor_requests',
				'thesis_progress.stuck_warning',
				jsonb_build_object(
					'request_id',       $1::text,
					'student_user_id',  $2::text,
					'lecturer_user_id', $3::text,
					'student_name',     $4::text,
					'lecturer_name',    $5::text,
					'topic_title',      $6::text,
					'days_stuck',       $7::int
				)
			)
		`, p.requestID, p.studentUserID, p.lecturerUserID,
			p.studentName, p.lecturerName, p.topicTitle,
			p.daysStuck); err != nil {
			log.Printf("progress-stuck: outbox %s: %v", p.requestID, err)
			return
		}
	}

	if err := tx.Commit(scanCtx); err != nil {
		log.Printf("progress-stuck: commit: %v", err)
		return
	}

	log.Printf("progress-stuck: emitted %d warning(s)", len(items))
}
