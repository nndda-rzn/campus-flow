package service

import (
	"context"
	"errors"
	"time"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

var (
	ErrNotSupervisor = errors.New("lecturer is not the supervisor of this student")
	ErrProgressNotFound = errors.New("progress not found")
)

type ThesisService struct {
	repo *repository.ThesisRepository
}

func NewThesisService(repo *repository.ThesisRepository) *ThesisService {
	return &ThesisService{repo: repo}
}

func (s *ThesisService) GetMilestonesByDepartment(ctx context.Context, departmentID string) ([]model.ThesisMilestone, error) {
	return s.repo.GetMilestonesByDepartment(ctx, departmentID)
}

func (s *ThesisService) CreateMilestone(ctx context.Context, m *model.ThesisMilestone) (*model.ThesisMilestone, error) {
	return s.repo.CreateMilestone(ctx, m)
}

func (s *ThesisService) UpdateMilestone(ctx context.Context, m *model.ThesisMilestone) error {
	return s.repo.UpdateMilestone(ctx, m)
}

func (s *ThesisService) DeleteMilestone(ctx context.Context, id string) error {
	return s.repo.DeleteMilestone(ctx, id)
}

func (s *ThesisService) GetProgressByStudent(ctx context.Context, studentUserID string) ([]model.ThesisProgress, error) {
	return s.repo.GetProgressByStudent(ctx, studentUserID)
}

func (s *ThesisService) UpdateProgress(ctx context.Context, id string, notes string, targetDateStr string, status string) (*model.ThesisProgress, error) {
	var targetDate *time.Time
	if targetDateStr != "" {
		t, err := time.Parse(time.DateOnly, targetDateStr)
		if err == nil {
			targetDate = &t
		}
	}
	return s.repo.UpdateProgress(ctx, id, notes, targetDate, status)
}

// --- Lecturer Progress View ---

// ListSupervisedProgress returns all supervised students with their progress summary
func (s *ThesisService) ListSupervisedProgress(ctx context.Context, lecturerUserID string, includeCompleted bool, stuckThresholdDays int) ([]repository.SupervisedStudentProgress, error) {
	return s.repo.GetProgressByLecturer(ctx, lecturerUserID, includeCompleted, stuckThresholdDays)
}

// GetStudentProgressDetail returns detailed progress for a specific student
// Validates that the lecturer is the supervisor
func (s *ThesisService) GetStudentProgressDetail(ctx context.Context, studentUserID, lecturerUserID string) (*repository.SupervisedStudentProgress, error) {
	return s.repo.GetStudentProgressForLecturer(ctx, studentUserID, lecturerUserID)
}

// CompleteMilestone marks a milestone as completed by the lecturer
func (s *ThesisService) CompleteMilestone(ctx context.Context, progressID, lecturerUserID, notes string) (*model.ThesisProgress, error) {
	// Validate lecturer supervises this progress
	valid, err := s.repo.ValidateLecturerSupervisesProgress(ctx, lecturerUserID, progressID)
	if err != nil {
		return nil, err
	}
	if !valid {
		return nil, ErrNotSupervisor
	}

	// Get current progress to check status
	progress, err := s.repo.GetProgressByID(ctx, progressID)
	if err != nil {
		return nil, ErrProgressNotFound
	}

	// Only allow completing if not already completed
	if progress.Status == "COMPLETED" {
		return progress, nil // Already completed, return as-is
	}

	// Update to completed
	return s.repo.UpdateProgress(ctx, progressID, notes, nil, "COMPLETED")
}

func (s *ThesisService) ListDepartmentThesisOverview(ctx context.Context, departmentID string, stuckOnly bool, search string) (*repository.ThesisOverviewSummary, error) {
	return s.repo.ListDepartmentThesisOverview(ctx, departmentID, stuckOnly, search)
}
