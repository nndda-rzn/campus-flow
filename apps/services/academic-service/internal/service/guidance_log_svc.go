package service

import (
	"context"
	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

type GuidanceLogService struct {
	repo *repository.GuidanceLogRepository
}

func NewGuidanceLogService(repo *repository.GuidanceLogRepository) *GuidanceLogService {
	return &GuidanceLogService{repo: repo}
}

func (s *GuidanceLogService) GetLogsByStudent(ctx context.Context, studentUserID string) ([]model.GuidanceLog, error) {
	return s.repo.GetLogsByStudent(ctx, studentUserID)
}

func (s *GuidanceLogService) GetLogsByLecturer(ctx context.Context, lecturerUserID string) ([]model.GuidanceLog, error) {
	return s.repo.GetLogsByLecturer(ctx, lecturerUserID)
}

func (s *GuidanceLogService) GetLogByID(ctx context.Context, id string) (*model.GuidanceLog, error) {
	return s.repo.GetLogByID(ctx, id)
}

func (s *GuidanceLogService) CreateLog(ctx context.Context, log *model.GuidanceLog) (*model.GuidanceLog, error) {
	log.Status = "DRAFT"
	return s.repo.CreateLog(ctx, log)
}

func (s *GuidanceLogService) UpdateLog(ctx context.Context, log *model.GuidanceLog) error {
	return s.repo.UpdateLog(ctx, log)
}

func (s *GuidanceLogService) DeleteLog(ctx context.Context, id string) error {
	return s.repo.DeleteLog(ctx, id)
}
