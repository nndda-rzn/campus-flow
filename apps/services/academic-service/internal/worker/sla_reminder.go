package worker

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// StartSLAReminderWorker scans service_requests for in-flight rows that are
// close to (or past) their due_at and emits academic_request.sla_warning
// outbox events. It updates last_sla_warning_at to throttle reminders so
// students/admins are not spammed every tick (FR-266).
//
// Idempotent because the UPDATE + INSERT INTO outbox happen in the same
// transaction; if the worker crashes mid-row, the next tick retries.
func StartSLAReminderWorker(
	ctx context.Context,
	db *pgxpool.Pool,
	interval time.Duration,
) {
	if interval <= 0 {
		interval = time.Hour
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Printf("Academic SLA reminder worker started (tick=%s)", interval)

	// Run once at boot so dev iterations see immediate output.
	scanAndEmit(ctx, db)

	for {
		select {
		case <-ctx.Done():
			log.Println("Academic SLA reminder worker stopped")
			return
		case <-ticker.C:
			scanAndEmit(ctx, db)
		}
	}
}

func scanAndEmit(ctx context.Context, db *pgxpool.Pool) {
	scanCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	tx, err := db.Begin(scanCtx)
	if err != nil {
		log.Printf("sla-reminder: begin tx: %v", err)
		return
	}
	defer tx.Rollback(scanCtx)

	rows, err := tx.Query(scanCtx, `
		SELECT
			sr.id::text,
			sr.request_number,
			sr.student_user_id::text,
			sr.title,
			sr.status,
			sr.due_at
		FROM service_requests sr
		WHERE sr.status NOT IN ('COMPLETED', 'REJECTED', 'CANCELLED')
		  AND sr.due_at IS NOT NULL
		  AND sr.due_at < NOW() + INTERVAL '24 hours'
		  AND sr.due_at > NOW() - INTERVAL '7 days'
		  AND (sr.last_sla_warning_at IS NULL
		       OR sr.last_sla_warning_at < NOW() - INTERVAL '23 hours')
		FOR UPDATE SKIP LOCKED
		LIMIT 50
	`)
	if err != nil {
		log.Printf("sla-reminder: select: %v", err)
		return
	}

	type pending struct {
		id, requestNumber, studentUserID, title, status string
		dueAt                                           time.Time
	}
	var items []pending
	for rows.Next() {
		var p pending
		if err := rows.Scan(&p.id, &p.requestNumber, &p.studentUserID, &p.title, &p.status, &p.dueAt); err != nil {
			rows.Close()
			log.Printf("sla-reminder: scan: %v", err)
			return
		}
		items = append(items, p)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		log.Printf("sla-reminder: rows err: %v", err)
		return
	}

	if len(items) == 0 {
		_ = tx.Commit(scanCtx)
		return
	}

	for _, p := range items {
		// Update marker first so we can include the new value semantically;
		// repeats on the same row are blocked by the WHERE clause above.
		if _, err := tx.Exec(scanCtx, `
			UPDATE service_requests SET last_sla_warning_at = NOW()
			WHERE id = $1::uuid
		`, p.id); err != nil {
			log.Printf("sla-reminder: update last_sla_warning_at %s: %v", p.id, err)
			return
		}

		if _, err := tx.Exec(scanCtx, `
			INSERT INTO outbox_events (
				aggregate_id, aggregate_type, event_type, payload
			)
			VALUES (
				$1::uuid,
				'service_requests',
				'academic_request.sla_warning',
				jsonb_build_object(
					'request_id',      $1::text,
					'request_number',  $2::text,
					'student_user_id', $3::text,
					'title',           $4::text,
					'status',          $5::text,
					'due_at',          $6::text
				)
			)
		`, p.id, p.requestNumber, p.studentUserID, p.title, p.status,
			p.dueAt.Format(time.RFC3339)); err != nil {
			log.Printf("sla-reminder: outbox %s: %v", p.id, err)
			return
		}
	}

	if err := tx.Commit(scanCtx); err != nil {
		log.Printf("sla-reminder: commit: %v", err)
		return
	}

	log.Printf("sla-reminder: emitted %d warning(s)", len(items))
}
