package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"campus-flow/apps/services/academic-service/internal/model"
)

var (
	ErrSlotOverlap       = errors.New("slot overlaps with existing slot")
	ErrSlotNotFound      = errors.New("consultation slot not found")
	ErrBookingNotFound   = errors.New("consultation booking not found")
	ErrSlotFull          = errors.New("slot is fully booked")
	ErrBookingTooLate    = errors.New("booking must be made at least 12 hours before slot")
	ErrAlreadyBooked     = errors.New("you have already booked this slot")
	ErrNotYourBooking    = errors.New("this booking does not belong to you")
	ErrInvalidTransition = errors.New("invalid status transition")
)

type ConsultationRepository struct {
	db *pgxpool.Pool
}

func NewConsultationRepository(db *pgxpool.Pool) *ConsultationRepository {
	return &ConsultationRepository{db: db}
}

// ─── Slots ──────────────────────────────────────────────────────────────────

func (r *ConsultationRepository) CreateSlot(ctx context.Context, slot *model.ConsultationSlot) (*model.ConsultationSlot, error) {
	query := `
		INSERT INTO consultation_slots (lecturer_user_id, slot_date, start_time, end_time, max_bookings, location, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query,
		slot.LecturerUserID,
		slot.SlotDate,
		slot.StartTime,
		slot.EndTime,
		slot.MaxBookings,
		slot.Location,
		slot.Notes,
	).Scan(&slot.ID, &slot.CreatedAt, &slot.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return slot, nil
}

func (r *ConsultationRepository) UpdateSlot(ctx context.Context, slot *model.ConsultationSlot) error {
	query := `
		UPDATE consultation_slots
		SET slot_date = $1, start_time = $2, end_time = $3, max_bookings = $4, location = $5, notes = $6, updated_at = NOW()
		WHERE id = $7 AND lecturer_user_id = $8 AND is_cancelled = FALSE
	`

	result, err := r.db.Exec(ctx, query,
		slot.SlotDate,
		slot.StartTime,
		slot.EndTime,
		slot.MaxBookings,
		slot.Location,
		slot.Notes,
		slot.ID,
		slot.LecturerUserID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrSlotNotFound
	}

	return nil
}

func (r *ConsultationRepository) CancelSlot(ctx context.Context, id, lecturerUserID string) error {
	query := `
		UPDATE consultation_slots
		SET is_cancelled = TRUE, updated_at = NOW()
		WHERE id = $1 AND lecturer_user_id = $2 AND is_cancelled = FALSE
	`

	result, err := r.db.Exec(ctx, query, id, lecturerUserID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrSlotNotFound
	}

	return nil
}

func (r *ConsultationRepository) GetSlotByID(ctx context.Context, id string) (*model.ConsultationSlot, error) {
	query := `
		SELECT 
			cs.id, cs.lecturer_user_id, COALESCE(l.full_name, '') as lecturer_name,
			cs.slot_date, cs.start_time::text, cs.end_time::text, cs.max_bookings,
			(SELECT COUNT(*) FROM consultation_bookings cb WHERE cb.slot_id = cs.id AND cb.status NOT IN ('CANCELLED', 'REJECTED')) as current_bookings,
			cs.location, cs.notes, cs.is_cancelled, cs.created_at, cs.updated_at
		FROM consultation_slots cs
		LEFT JOIN lecturers l ON l.user_id = cs.lecturer_user_id
		WHERE cs.id = $1
	`

	var slot model.ConsultationSlot
	err := r.db.QueryRow(ctx, query, id).Scan(
		&slot.ID, &slot.LecturerUserID, &slot.LecturerName,
		&slot.SlotDate, &slot.StartTime, &slot.EndTime, &slot.MaxBookings,
		&slot.CurrentBookings,
		&slot.Location, &slot.Notes, &slot.IsCancelled, &slot.CreatedAt, &slot.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSlotNotFound
		}
		return nil, err
	}

	return &slot, nil
}

func (r *ConsultationRepository) ListSlotsByLecturer(ctx context.Context, lecturerUserID string, startDate, endDate *time.Time, includeCancelled bool) ([]model.ConsultationSlot, error) {
	query := `
		SELECT 
			cs.id, cs.lecturer_user_id, COALESCE(l.full_name, '') as lecturer_name,
			cs.slot_date, cs.start_time::text, cs.end_time::text, cs.max_bookings,
			(SELECT COUNT(*) FROM consultation_bookings cb WHERE cb.slot_id = cs.id AND cb.status NOT IN ('CANCELLED', 'REJECTED')) as current_bookings,
			cs.location, cs.notes, cs.is_cancelled, cs.created_at, cs.updated_at
		FROM consultation_slots cs
		LEFT JOIN lecturers l ON l.user_id = cs.lecturer_user_id
		WHERE cs.lecturer_user_id = $1
	`

	args := []interface{}{lecturerUserID}
	argIdx := 2

	if !includeCancelled {
		query += " AND cs.is_cancelled = FALSE"
	}

	if startDate != nil {
		query += " AND cs.slot_date >= $" + string(rune('0'+argIdx))
		args = append(args, *startDate)
		argIdx++
	}

	if endDate != nil {
		query += " AND cs.slot_date <= $" + string(rune('0'+argIdx))
		args = append(args, *endDate)
	}

	query += " ORDER BY cs.slot_date ASC, cs.start_time ASC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var slots []model.ConsultationSlot
	for rows.Next() {
		var slot model.ConsultationSlot
		if err := rows.Scan(
			&slot.ID, &slot.LecturerUserID, &slot.LecturerName,
			&slot.SlotDate, &slot.StartTime, &slot.EndTime, &slot.MaxBookings,
			&slot.CurrentBookings,
			&slot.Location, &slot.Notes, &slot.IsCancelled, &slot.CreatedAt, &slot.UpdatedAt,
		); err != nil {
			return nil, err
		}
		slots = append(slots, slot)
	}

	return slots, rows.Err()
}

func (r *ConsultationRepository) GetAvailableSlotsForStudent(ctx context.Context, studentUserID string) ([]model.ConsultationSlot, error) {
	// Get slots from lecturers who supervise this student, that are not cancelled, not full, and at least 12 hours in the future
	query := `
		SELECT 
			cs.id, cs.lecturer_user_id, COALESCE(l.full_name, '') as lecturer_name,
			cs.slot_date, cs.start_time::text, cs.end_time::text, cs.max_bookings,
			(SELECT COUNT(*) FROM consultation_bookings cb WHERE cb.slot_id = cs.id AND cb.status NOT IN ('CANCELLED', 'REJECTED')) as current_bookings,
			cs.location, cs.notes, cs.is_cancelled, cs.created_at, cs.updated_at
		FROM consultation_slots cs
		JOIN lecturers l ON l.user_id = cs.lecturer_user_id
		JOIN supervisor_assignments sa ON sa.lecturer_id = l.id AND sa.is_current = TRUE
		JOIN supervisor_requests sr ON sr.id = sa.request_id AND sr.student_user_id = $1 AND sr.status IN ('ACCEPTED', 'COMPLETED')
		WHERE cs.is_cancelled = FALSE
		  AND (cs.slot_date + cs.start_time) > (NOW() + INTERVAL '12 hours')
		  AND (SELECT COUNT(*) FROM consultation_bookings cb WHERE cb.slot_id = cs.id AND cb.status NOT IN ('CANCELLED', 'REJECTED')) < cs.max_bookings
		ORDER BY cs.slot_date ASC, cs.start_time ASC
	`

	rows, err := r.db.Query(ctx, query, studentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var slots []model.ConsultationSlot
	for rows.Next() {
		var slot model.ConsultationSlot
		if err := rows.Scan(
			&slot.ID, &slot.LecturerUserID, &slot.LecturerName,
			&slot.SlotDate, &slot.StartTime, &slot.EndTime, &slot.MaxBookings,
			&slot.CurrentBookings,
			&slot.Location, &slot.Notes, &slot.IsCancelled, &slot.CreatedAt, &slot.UpdatedAt,
		); err != nil {
			return nil, err
		}
		slots = append(slots, slot)
	}

	return slots, rows.Err()
}

func (r *ConsultationRepository) CheckSlotOverlap(ctx context.Context, lecturerUserID string, slotDate time.Time, startTime, endTime string, excludeID *string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM consultation_slots
			WHERE lecturer_user_id = $1
			  AND slot_date = $2
			  AND is_cancelled = FALSE
			  AND (
				(start_time < $4::time AND end_time > $3::time)
			  )
	`
	args := []interface{}{lecturerUserID, slotDate, startTime, endTime}

	if excludeID != nil {
		query += " AND id != $5"
		args = append(args, *excludeID)
	}

	query += ")"

	var exists bool
	err := r.db.QueryRow(ctx, query, args...).Scan(&exists)
	return exists, err
}

// ─── Bookings ───────────────────────────────────────────────────────────────

func (r *ConsultationRepository) CreateBooking(ctx context.Context, booking *model.ConsultationBooking) (*model.ConsultationBooking, error) {
	query := `
		INSERT INTO consultation_bookings (slot_id, student_user_id, topic, status)
		VALUES ($1, $2, $3, 'PENDING')
		RETURNING id, status, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query,
		booking.SlotID,
		booking.StudentUserID,
		booking.Topic,
	).Scan(&booking.ID, &booking.Status, &booking.CreatedAt, &booking.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return booking, nil
}

func (r *ConsultationRepository) GetBookingByID(ctx context.Context, id string) (*model.ConsultationBooking, error) {
	query := `
		SELECT 
			cb.id, cb.slot_id, cb.student_user_id, 
			COALESCE(s.full_name, '') as student_name, COALESCE(s.nim, '') as student_nim,
			cb.topic, cb.status, cb.lecturer_notes, cb.proposed_slot_id,
			cb.created_at, cb.updated_at,
			cs.slot_date, cs.start_time::text, cs.end_time::text, cs.location,
			COALESCE(l.full_name, '') as lecturer_name
		FROM consultation_bookings cb
		JOIN consultation_slots cs ON cs.id = cb.slot_id
		LEFT JOIN students s ON s.user_id = cb.student_user_id
		LEFT JOIN lecturers l ON l.user_id = cs.lecturer_user_id
		WHERE cb.id = $1
	`

	var booking model.ConsultationBooking
	err := r.db.QueryRow(ctx, query, id).Scan(
		&booking.ID, &booking.SlotID, &booking.StudentUserID,
		&booking.StudentName, &booking.StudentNIM,
		&booking.Topic, &booking.Status, &booking.LecturerNotes, &booking.ProposedSlotID,
		&booking.CreatedAt, &booking.UpdatedAt,
		&booking.SlotDate, &booking.StartTime, &booking.EndTime, &booking.Location,
		&booking.LecturerName,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}

	return &booking, nil
}

func (r *ConsultationRepository) UpdateBookingStatus(ctx context.Context, id string, status model.ConsultationBookingStatus, notes *string, proposedSlotID *string) error {
	query := `
		UPDATE consultation_bookings
		SET status = $1, lecturer_notes = $2, proposed_slot_id = $3, updated_at = NOW()
		WHERE id = $4
	`

	result, err := r.db.Exec(ctx, query, status, notes, proposedSlotID, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrBookingNotFound
	}

	return nil
}

func (r *ConsultationRepository) ListBookingsByLecturer(ctx context.Context, lecturerUserID string, statusFilter string) ([]model.ConsultationBooking, error) {
	query := `
		SELECT 
			cb.id, cb.slot_id, cb.student_user_id, 
			COALESCE(s.full_name, '') as student_name, COALESCE(s.nim, '') as student_nim,
			cb.topic, cb.status, cb.lecturer_notes, cb.proposed_slot_id,
			cb.created_at, cb.updated_at,
			cs.slot_date, cs.start_time::text, cs.end_time::text, cs.location,
			COALESCE(l.full_name, '') as lecturer_name
		FROM consultation_bookings cb
		JOIN consultation_slots cs ON cs.id = cb.slot_id
		LEFT JOIN students s ON s.user_id = cb.student_user_id
		LEFT JOIN lecturers l ON l.user_id = cs.lecturer_user_id
		WHERE cs.lecturer_user_id = $1
	`

	args := []interface{}{lecturerUserID}

	if statusFilter != "" {
		query += " AND cb.status = $2"
		args = append(args, statusFilter)
	}

	query += " ORDER BY cs.slot_date DESC, cs.start_time DESC, cb.created_at DESC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []model.ConsultationBooking
	for rows.Next() {
		var b model.ConsultationBooking
		if err := rows.Scan(
			&b.ID, &b.SlotID, &b.StudentUserID,
			&b.StudentName, &b.StudentNIM,
			&b.Topic, &b.Status, &b.LecturerNotes, &b.ProposedSlotID,
			&b.CreatedAt, &b.UpdatedAt,
			&b.SlotDate, &b.StartTime, &b.EndTime, &b.Location,
			&b.LecturerName,
		); err != nil {
			return nil, err
		}
		bookings = append(bookings, b)
	}

	return bookings, rows.Err()
}

func (r *ConsultationRepository) ListBookingsByStudent(ctx context.Context, studentUserID string) ([]model.ConsultationBooking, error) {
	query := `
		SELECT 
			cb.id, cb.slot_id, cb.student_user_id, 
			COALESCE(s.full_name, '') as student_name, COALESCE(s.nim, '') as student_nim,
			cb.topic, cb.status, cb.lecturer_notes, cb.proposed_slot_id,
			cb.created_at, cb.updated_at,
			cs.slot_date, cs.start_time::text, cs.end_time::text, cs.location,
			COALESCE(l.full_name, '') as lecturer_name
		FROM consultation_bookings cb
		JOIN consultation_slots cs ON cs.id = cb.slot_id
		LEFT JOIN students s ON s.user_id = cb.student_user_id
		LEFT JOIN lecturers l ON l.user_id = cs.lecturer_user_id
		WHERE cb.student_user_id = $1
		ORDER BY cs.slot_date DESC, cs.start_time DESC
	`

	rows, err := r.db.Query(ctx, query, studentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []model.ConsultationBooking
	for rows.Next() {
		var b model.ConsultationBooking
		if err := rows.Scan(
			&b.ID, &b.SlotID, &b.StudentUserID,
			&b.StudentName, &b.StudentNIM,
			&b.Topic, &b.Status, &b.LecturerNotes, &b.ProposedSlotID,
			&b.CreatedAt, &b.UpdatedAt,
			&b.SlotDate, &b.StartTime, &b.EndTime, &b.Location,
			&b.LecturerName,
		); err != nil {
			return nil, err
		}
		bookings = append(bookings, b)
	}

	return bookings, rows.Err()
}

func (r *ConsultationRepository) CountBookingsForSlot(ctx context.Context, slotID string) (int, error) {
	query := `
		SELECT COUNT(*) FROM consultation_bookings
		WHERE slot_id = $1 AND status NOT IN ('CANCELLED', 'REJECTED')
	`

	var count int
	err := r.db.QueryRow(ctx, query, slotID).Scan(&count)
	return count, err
}

func (r *ConsultationRepository) GetBookingsBySlotID(ctx context.Context, slotID string) ([]model.ConsultationBooking, error) {
	query := `
		SELECT 
			cb.id, cb.slot_id, cb.student_user_id, 
			COALESCE(s.full_name, '') as student_name, COALESCE(s.nim, '') as student_nim,
			cb.topic, cb.status, cb.lecturer_notes, cb.proposed_slot_id,
			cb.created_at, cb.updated_at,
			cs.slot_date, cs.start_time::text, cs.end_time::text, cs.location,
			COALESCE(l.full_name, '') as lecturer_name
		FROM consultation_bookings cb
		JOIN consultation_slots cs ON cs.id = cb.slot_id
		LEFT JOIN students s ON s.user_id = cb.student_user_id
		LEFT JOIN lecturers l ON l.user_id = cs.lecturer_user_id
		WHERE cb.slot_id = $1 AND cb.status NOT IN ('CANCELLED', 'REJECTED')
	`

	rows, err := r.db.Query(ctx, query, slotID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []model.ConsultationBooking
	for rows.Next() {
		var b model.ConsultationBooking
		if err := rows.Scan(
			&b.ID, &b.SlotID, &b.StudentUserID,
			&b.StudentName, &b.StudentNIM,
			&b.Topic, &b.Status, &b.LecturerNotes, &b.ProposedSlotID,
			&b.CreatedAt, &b.UpdatedAt,
			&b.SlotDate, &b.StartTime, &b.EndTime, &b.Location,
			&b.LecturerName,
		); err != nil {
			return nil, err
		}
		bookings = append(bookings, b)
	}

	return bookings, rows.Err()
}

func (r *ConsultationRepository) CancelAllBookingsForSlot(ctx context.Context, slotID string) ([]model.ConsultationBooking, error) {
	// First get all active bookings for notification
	bookings, err := r.GetBookingsBySlotID(ctx, slotID)
	if err != nil {
		return nil, err
	}

	// Cancel all active bookings
	query := `
		UPDATE consultation_bookings
		SET status = 'CANCELLED', lecturer_notes = 'Slot dibatalkan oleh dosen', updated_at = NOW()
		WHERE slot_id = $1 AND status NOT IN ('CANCELLED', 'REJECTED')
	`

	_, err = r.db.Exec(ctx, query, slotID)
	if err != nil {
		return nil, err
	}

	return bookings, nil
}

func (r *ConsultationRepository) ValidateStudentCanBook(ctx context.Context, studentUserID, slotID string) error {
	// Check if slot exists and is not cancelled
	slot, err := r.GetSlotByID(ctx, slotID)
	if err != nil {
		return err
	}

	if slot.IsCancelled {
		return ErrSlotNotFound
	}

	// Check if slot is full
	if slot.CurrentBookings >= slot.MaxBookings {
		return ErrSlotFull
	}

	// Check 12-hour rule
	slotDateTime := time.Date(
		slot.SlotDate.Year(), slot.SlotDate.Month(), slot.SlotDate.Day(),
		0, 0, 0, 0, time.Local,
	)
	// Parse start time
	hour, min := parseTime(slot.StartTime)
	slotDateTime = slotDateTime.Add(time.Duration(hour)*time.Hour + time.Duration(min)*time.Minute)

	if time.Until(slotDateTime) < 12*time.Hour {
		return ErrBookingTooLate
	}

	// Check if student already booked this slot
	query := `
		SELECT EXISTS(
			SELECT 1 FROM consultation_bookings
			WHERE slot_id = $1 AND student_user_id = $2 AND status NOT IN ('CANCELLED', 'REJECTED')
		)
	`
	var exists bool
	err = r.db.QueryRow(ctx, query, slotID, studentUserID).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return ErrAlreadyBooked
	}

	return nil
}

func parseTime(timeStr string) (int, int) {
	t, err := time.Parse("15:04", timeStr)
	if err != nil {
		t, err = time.Parse("15:04:05", timeStr)
	}
	if err != nil {
		return 0, 0
	}
	return t.Hour(), t.Minute()
}
