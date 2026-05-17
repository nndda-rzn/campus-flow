package service

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

var (
	ErrDirectoryNotFound      = errors.New("directory entry not found")
	ErrDirectoryDuplicate     = errors.New("duplicate directory entry")
	ErrDirectoryInvalidStatus = errors.New("invalid directory status")
)

// ─── Departments ────────────────────────────────────────────────────────────

func (s *AcademicService) ListDepartments(ctx context.Context) ([]model.Department, error) {
	dirRepo := repository.NewDirectoryRepository(s.repo.DB())
	return dirRepo.ListDepartments(ctx)
}

func (s *AcademicService) CreateDepartment(
	ctx context.Context,
	code string,
	name string,
) (*model.Department, error) {
	if strings.TrimSpace(code) == "" || strings.TrimSpace(name) == "" {
		return nil, ErrInvalidInput
	}
	dirRepo := repository.NewDirectoryRepository(s.repo.DB())
	dept, err := dirRepo.CreateDepartment(ctx, code, name)
	if errors.Is(err, repository.ErrCodeDuplicate) {
		return nil, ErrDirectoryDuplicate
	}
	return dept, err
}

func (s *AcademicService) UpdateDepartment(
	ctx context.Context,
	id string,
	code string,
	name string,
) (*model.Department, error) {
	if strings.TrimSpace(id) == "" {
		return nil, ErrInvalidInput
	}
	dirRepo := repository.NewDirectoryRepository(s.repo.DB())
	dept, err := dirRepo.UpdateDepartment(ctx, id, code, name)
	if errors.Is(err, repository.ErrDepartmentNotFound) {
		return nil, ErrDirectoryNotFound
	}
	if errors.Is(err, repository.ErrCodeDuplicate) {
		return nil, ErrDirectoryDuplicate
	}
	return dept, err
}

// ─── Students ───────────────────────────────────────────────────────────────

func (s *AcademicService) ListStudents(
	ctx context.Context,
	statusFilter string,
	search string,
) ([]model.Student, error) {
	dirRepo := repository.NewDirectoryRepository(s.repo.DB())
	return dirRepo.ListStudents(ctx, statusFilter, search)
}

func (s *AcademicService) UpsertStudent(
	ctx context.Context,
	userID string,
	nim string,
	fullName string,
	email string,
	departmentID string,
) (*model.Student, error) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(fullName) == "" {
		return nil, ErrInvalidInput
	}

	dirRepo := repository.NewDirectoryRepository(s.repo.DB())

	// If both NIM and department are provided, this is a real binding -> ACTIVE.
	// Otherwise leave status as-is by setting ACTIVE (admin chose to update).
	status := "ACTIVE"
	if strings.TrimSpace(nim) == "" && strings.TrimSpace(departmentID) == "" {
		status = "PENDING_BIND"
	}

	student, err := dirRepo.UpsertStudent(ctx, userID, nim, fullName, email, departmentID, status)
	if errors.Is(err, repository.ErrNIMDuplicate) {
		return nil, ErrDirectoryDuplicate
	}
	return student, err
}

func (s *AcademicService) SetStudentStatus(
	ctx context.Context,
	userID string,
	status string,
) (*model.Student, error) {
	dirRepo := repository.NewDirectoryRepository(s.repo.DB())
	student, err := dirRepo.SetStudentStatus(ctx, userID, status)
	if errors.Is(err, repository.ErrStudentNotFound) {
		return nil, ErrDirectoryNotFound
	}
	if errors.Is(err, repository.ErrInvalidStatus) {
		return nil, ErrDirectoryInvalidStatus
	}
	return student, err
}

// ─── Lecturers ──────────────────────────────────────────────────────────────

func (s *AcademicService) ListAllLecturers(
	ctx context.Context,
	statusFilter string,
	search string,
) ([]model.LecturerProfile, error) {
	dirRepo := repository.NewDirectoryRepository(s.repo.DB())
	return dirRepo.ListAllLecturers(ctx, statusFilter, search)
}

func (s *AcademicService) UpsertLecturer(
	ctx context.Context,
	userID string,
	nidn string,
	fullName string,
	email string,
	departmentID string,
	maxQuota int32,
) (*model.LecturerProfile, error) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(fullName) == "" {
		return nil, ErrInvalidInput
	}
	dirRepo := repository.NewDirectoryRepository(s.repo.DB())
	lec, err := dirRepo.UpsertLecturer(ctx, userID, nidn, fullName, email, departmentID, maxQuota)
	if errors.Is(err, repository.ErrNIDNDuplicate) {
		return nil, ErrDirectoryDuplicate
	}
	return lec, err
}

func (s *AcademicService) SetLecturerStatus(
	ctx context.Context,
	userID string,
	status string,
) (*model.LecturerProfile, error) {
	dirRepo := repository.NewDirectoryRepository(s.repo.DB())
	lec, err := dirRepo.SetLecturerStatus(ctx, userID, status)
	if errors.Is(err, repository.ErrLecturerNotFoundV2) {
		return nil, ErrDirectoryNotFound
	}
	if errors.Is(err, repository.ErrInvalidStatus) {
		return nil, ErrDirectoryInvalidStatus
	}
	return lec, err
}

// AutoStubFromUserRegistered is invoked by the consumer worker when a user
// with role MAHASISWA or DOSEN registers. Idempotent.
func (s *AcademicService) AutoStubFromUserRegistered(
	ctx context.Context,
	userID string,
	fullName string,
	email string,
	role string,
) error {
	if strings.TrimSpace(userID) == "" {
		return ErrInvalidInput
	}

	dirRepo := repository.NewDirectoryRepository(s.repo.DB())

	switch strings.ToUpper(strings.TrimSpace(role)) {
	case "MAHASISWA":
		return dirRepo.AutoStubStudent(ctx, userID, fullName, email)
	case "DOSEN":
		return dirRepo.AutoStubLecturer(ctx, userID, fullName, email)
	default:
		return nil // no stub for SUPER_ADMIN, ADMIN_PRODI, KAPRODI, TATA_USAHA
	}
}
