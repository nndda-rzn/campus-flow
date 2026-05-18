package service

import (
	"context"
	"database/sql"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type LecturerProfile struct {
	ID                 string
	UserID             string
	NIDN               string
	FullName           string
	Email              string
	DepartmentID       string
	DepartmentName     string
	Status             string
	MaxSupervisorQuota int
	CurrentQuotaUsed   int
	CreatedAt          string
	UpdatedAt          string
}

type SupervisorRequestSummaryDTO struct {
	ID          string
	StudentName string
	TopicTitle  string
	Status      string
	CreatedAt   string
}

type ConsultationBookingSummaryDTO struct {
	ID          string
	StudentName string
	Topic       string
	SlotDate    string
	StartTime   string
}

type LecturerDashboard struct {
	TotalSupervisedStudents     int
	PendingSupervisorRequests   int
	PendingConsultationBookings int
	QuotaUsed                   int
	QuotaMax                    int
	RecentRequests              []SupervisorRequestSummaryDTO
	PendingBookings             []ConsultationBookingSummaryDTO
}

type QuotaDetailDTO struct {
	StudentName string
	RequestID   string
	Status      string
}

type LecturerQuota struct {
	AcademicYearID   string
	AcademicYearName string
	MaxQuota         int
	CurrentUsed      int
	Available        int
	Details          []QuotaDetailDTO
}

func (s *AcademicService) GetLecturerProfile(ctx context.Context, userID string) (*LecturerProfile, error) {
	query := `
		SELECT l.id, l.user_id, COALESCE(l.nidn, ''), l.full_name, l.email,
		       COALESCE(l.department_id::text, ''), COALESCE(d.name, ''), l.status,
		       l.max_supervisor_quota, l.created_at, l.updated_at
		FROM lecturers l
		LEFT JOIN departments d ON l.department_id = d.id
		WHERE l.user_id = $1
	`

	var profile LecturerProfile
	var createdAt, updatedAt time.Time

	err := s.repo.DB().QueryRow(ctx, query, userID).Scan(
		&profile.ID, &profile.UserID, &profile.NIDN, &profile.FullName, &profile.Email,
		&profile.DepartmentID, &profile.DepartmentName, &profile.Status,
		&profile.MaxSupervisorQuota, &createdAt, &updatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, status.Error(codes.NotFound, "lecturer profile not found")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get lecturer profile: %v", err)
	}

	profile.CreatedAt = createdAt.Format(time.RFC3339)
	profile.UpdatedAt = updatedAt.Format(time.RFC3339)

	quotaQuery := `
		SELECT COALESCE(current_quota, 0)
		FROM lecturer_supervisor_quotas
		WHERE lecturer_id = $1 AND academic_year_id = (SELECT id FROM academic_years WHERE is_active = true LIMIT 1)
	`
	var currentQuota int
	err = s.repo.DB().QueryRow(ctx, quotaQuery, profile.ID).Scan(&currentQuota)
	if err != nil && err != sql.ErrNoRows {
		return nil, status.Errorf(codes.Internal, "failed to get quota: %v", err)
	}
	profile.CurrentQuotaUsed = currentQuota

	return &profile, nil
}

func (s *AcademicService) UpdateLecturerProfile(ctx context.Context, userID, fullName, email, nidn string) (*LecturerProfile, error) {
	query := `
		UPDATE lecturers
		SET full_name = COALESCE(NULLIF($2, ''), full_name),
		    email = COALESCE(NULLIF($3, ''), email),
		    nidn = COALESCE(NULLIF($4, ''), nidn),
		    updated_at = NOW()
		WHERE user_id = $1
		RETURNING id
	`

	var id string
	err := s.repo.DB().QueryRow(ctx, query, userID, fullName, email, nidn).Scan(&id)
	if err == sql.ErrNoRows {
		return nil, status.Error(codes.NotFound, "lecturer profile not found")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update lecturer profile: %v", err)
	}

	return s.GetLecturerProfile(ctx, userID)
}

func (s *AcademicService) GetLecturerDashboard(ctx context.Context, userID string) (*LecturerDashboard, error) {
	dashboard := &LecturerDashboard{}

	lecturerQuery := `SELECT id, max_supervisor_quota FROM lecturers WHERE user_id = $1`
	var lecturerID string
	var maxQuota int
	err := s.repo.DB().QueryRow(ctx, lecturerQuery, userID).Scan(&lecturerID, &maxQuota)
	if err == sql.ErrNoRows {
		return nil, status.Error(codes.NotFound, "lecturer not found")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get lecturer: %v", err)
	}
	dashboard.QuotaMax = maxQuota

	supervisedQuery := `
		SELECT COUNT(DISTINCT sa.id)
		FROM supervisor_assignments sa
		JOIN supervisor_requests sr ON sa.supervisor_request_id = sr.id
		WHERE sa.lecturer_id = $1 AND sa.status = 'ACCEPTED' AND sr.status = 'COMPLETED'
	`
	err = s.repo.DB().QueryRow(ctx, supervisedQuery, lecturerID).Scan(&dashboard.TotalSupervisedStudents)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to count supervised students: %v", err)
	}

	pendingRequestsQuery := `
		SELECT COUNT(*)
		FROM supervisor_assignments sa
		WHERE sa.lecturer_id = $1 AND sa.status = 'PENDING'
	`
	err = s.repo.DB().QueryRow(ctx, pendingRequestsQuery, lecturerID).Scan(&dashboard.PendingSupervisorRequests)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to count pending requests: %v", err)
	}

	pendingBookingsQuery := `
		SELECT COUNT(*)
		FROM consultation_bookings cb
		JOIN consultation_slots cs ON cb.slot_id = cs.id
		WHERE cs.lecturer_user_id = $1 AND cb.status = 'PENDING'
	`
	err = s.repo.DB().QueryRow(ctx, pendingBookingsQuery, userID).Scan(&dashboard.PendingConsultationBookings)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to count pending bookings: %v", err)
	}

	quotaQuery := `
		SELECT COALESCE(current_quota, 0)
		FROM lecturer_supervisor_quotas
		WHERE lecturer_id = $1 AND academic_year_id = (SELECT id FROM academic_years WHERE is_active = true LIMIT 1)
	`
	err = s.repo.DB().QueryRow(ctx, quotaQuery, lecturerID).Scan(&dashboard.QuotaUsed)
	if err != nil && err != sql.ErrNoRows {
		return nil, status.Errorf(codes.Internal, "failed to get quota: %v", err)
	}

	recentQuery := `
		SELECT sr.id, COALESCE(st.full_name, ''), sr.topic_title, sa.status, sr.created_at
		FROM supervisor_assignments sa
		JOIN supervisor_requests sr ON sa.supervisor_request_id = sr.id
		LEFT JOIN students st ON sr.student_user_id = st.user_id
		WHERE sa.lecturer_id = $1
		ORDER BY sr.created_at DESC
		LIMIT 5
	`
	rows, err := s.repo.DB().Query(ctx, recentQuery, lecturerID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get recent requests: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var r SupervisorRequestSummaryDTO
		var createdAt time.Time
		if err := rows.Scan(&r.ID, &r.StudentName, &r.TopicTitle, &r.Status, &createdAt); err != nil {
			return nil, status.Errorf(codes.Internal, "failed to scan request: %v", err)
		}
		r.CreatedAt = createdAt.Format(time.RFC3339)
		dashboard.RecentRequests = append(dashboard.RecentRequests, r)
	}

	bookingsQuery := `
		SELECT cb.id, COALESCE(st.full_name, ''), cb.topic, cs.slot_date::text, cs.start_time::text
		FROM consultation_bookings cb
		JOIN consultation_slots cs ON cb.slot_id = cs.id
		LEFT JOIN students st ON cb.student_user_id = st.user_id
		WHERE cs.lecturer_user_id = $1 AND cb.status = 'PENDING'
		ORDER BY cs.slot_date, cs.start_time
		LIMIT 5
	`
	bookingRows, err := s.repo.DB().Query(ctx, bookingsQuery, userID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get pending bookings: %v", err)
	}
	defer bookingRows.Close()

	for bookingRows.Next() {
		var b ConsultationBookingSummaryDTO
		if err := bookingRows.Scan(&b.ID, &b.StudentName, &b.Topic, &b.SlotDate, &b.StartTime); err != nil {
			return nil, status.Errorf(codes.Internal, "failed to scan booking: %v", err)
		}
		dashboard.PendingBookings = append(dashboard.PendingBookings, b)
	}

	return dashboard, nil
}

func (s *AcademicService) GetLecturerQuota(ctx context.Context, userID, academicYearID string) (*LecturerQuota, error) {
	lecturerQuery := `SELECT id, max_supervisor_quota FROM lecturers WHERE user_id = $1`
	var lecturerID string
	var maxQuota int
	err := s.repo.DB().QueryRow(ctx, lecturerQuery, userID).Scan(&lecturerID, &maxQuota)
	if err == sql.ErrNoRows {
		return nil, status.Error(codes.NotFound, "lecturer not found")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get lecturer: %v", err)
	}

	yearQuery := `
		SELECT id, name FROM academic_years
		WHERE CASE WHEN $1 = '' THEN is_active = true ELSE id::text = $1 END
		LIMIT 1
	`
	var yearID, yearName string
	err = s.repo.DB().QueryRow(ctx, yearQuery, academicYearID).Scan(&yearID, &yearName)
	if err == sql.ErrNoRows {
		return nil, status.Error(codes.NotFound, "academic year not found")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get academic year: %v", err)
	}

	quota := &LecturerQuota{
		AcademicYearID:   yearID,
		AcademicYearName: yearName,
		MaxQuota:         maxQuota,
	}

	detailsQuery := `
		SELECT COALESCE(st.full_name, ''), sr.id::text, sa.status
		FROM supervisor_assignments sa
		JOIN supervisor_requests sr ON sa.supervisor_request_id = sr.id
		LEFT JOIN students st ON sr.student_user_id = st.user_id
		WHERE sa.lecturer_id = $1 AND sr.academic_year_id = $2 AND sa.status IN ('PENDING', 'ACCEPTED')
		ORDER BY sr.created_at DESC
	`
	rows, err := s.repo.DB().Query(ctx, detailsQuery, lecturerID, yearID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get quota details: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var d QuotaDetailDTO
		if err := rows.Scan(&d.StudentName, &d.RequestID, &d.Status); err != nil {
			return nil, status.Errorf(codes.Internal, "failed to scan detail: %v", err)
		}
		quota.Details = append(quota.Details, d)
		quota.CurrentUsed++
	}

	quota.Available = quota.MaxQuota - quota.CurrentUsed
	if quota.Available < 0 {
		quota.Available = 0
	}

	return quota, nil
}
