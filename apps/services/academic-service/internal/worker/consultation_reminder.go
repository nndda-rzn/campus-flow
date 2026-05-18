package worker

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func StartConsultationReminderWorker(
	ctx context.Context,
	db *pgxpool.Pool,
	interval time.Duration,
) {
	if interval <= 0 {
		interval = time.Hour
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Printf("Consultation reminder worker started (tick=%s)", interval)

	scanConsultationReminders(ctx, db)

	for {
		select {
		case <-ctx.Done():
			log.Println("Consultation reminder worker stopped")
			return
		case <-ticker.C:
			scanConsultationReminders(ctx, db)
		}
	}
}

func scanConsultationReminders(ctx context.Context, db *pgxpool.Pool) {
	scanCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	tx, err := db.Begin(scanCtx)
	if err != nil {
		log.Printf("consultation-reminder: begin tx: %v", err)
		return
	}
	defer tx.Rollback(scanCtx)

	rows, err := tx.Query(scanCtx, `
		SELECT
			cb.id::text,
			cb.student_user_id::text,
			cs.lecturer_user_id::text,
			cb.topic,
			cs.slot_date::text,
			cs.start_time::text,
			cs.end_time::text,
			COALESCE(cs.location, '') as location,
			COALESCE(s.full_name, '') as student_name,
			COALESCE(l.full_name, '') as lecturer_name
		FROM consultation_bookings cb
		JOIN consultation_slots cs ON cs.id = cb.slot_id
		LEFT JOIN students s ON s.user_id = cb.student_user_id
		LEFT JOIN lecturers l ON l.user_id = cs.lecturer_user_id
		WHERE cb.status = 'APPROVED'
		  AND cb.reminder_sent_at IS NULL
		  AND (cs.slot_date + cs.start_time) > NOW()
		  AND (cs.slot_date + cs.start_time) < NOW() + INTERVAL '24 hours'
		FOR UPDATE OF cb SKIP LOCKED
		LIMIT 50
	`)
	if err != nil {
		log.Printf("consultation-reminder: select: %v", err)
		return
	}

	type pending struct {
		bookingID, studentUserID, lecturerUserID string
		topic, slotDate, startTime, endTime      string
		location, studentName, lecturerName      string
	}
	var items []pending
	for rows.Next() {
		var p pending
		if err := rows.Scan(
			&p.bookingID, &p.studentUserID, &p.lecturerUserID,
			&p.topic, &p.slotDate, &p.startTime, &p.endTime,
			&p.location, &p.studentName, &p.lecturerName,
		); err != nil {
			rows.Close()
			log.Printf("consultation-reminder: scan: %v", err)
			return
		}
		items = append(items, p)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		log.Printf("consultation-reminder: rows err: %v", err)
		return
	}

	if len(items) == 0 {
		_ = tx.Commit(scanCtx)
		return
	}

	for _, p := range items {
		if _, err := tx.Exec(scanCtx, `
			UPDATE consultation_bookings SET reminder_sent_at = NOW()
			WHERE id = $1::uuid
		`, p.bookingID); err != nil {
			log.Printf("consultation-reminder: update %s: %v", p.bookingID, err)
			return
		}

		if _, err := tx.Exec(scanCtx, `
			INSERT INTO outbox_events (
				aggregate_id, aggregate_type, event_type, payload
			)
			VALUES (
				$1::uuid,
				'consultation_bookings',
				'consultation_booking.reminder',
				jsonb_build_object(
					'booking_id',       $1::text,
					'student_user_id',  $2::text,
					'lecturer_user_id', $3::text,
					'topic',            $4::text,
					'slot_date',        $5::text,
					'start_time',       $6::text,
					'end_time',         $7::text,
					'location',         $8::text,
					'student_name',     $9::text,
					'lecturer_name',    $10::text
				)
			)
		`, p.bookingID, p.studentUserID, p.lecturerUserID,
			p.topic, p.slotDate, p.startTime, p.endTime,
			p.location, p.studentName, p.lecturerName); err != nil {
			log.Printf("consultation-reminder: outbox %s: %v", p.bookingID, err)
			return
		}
	}

	if err := tx.Commit(scanCtx); err != nil {
		log.Printf("consultation-reminder: commit: %v", err)
		return
	}

	log.Printf("consultation-reminder: emitted %d reminder(s)", len(items))
}
