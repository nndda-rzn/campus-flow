package service

import (
	"context"
	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
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
	// Parse targetDateStr to *time.Time logic can be handled in handler
	return s.repo.UpdateProgress(ctx, id, notes, nil, status) // Temporarily nil, update handler
}
