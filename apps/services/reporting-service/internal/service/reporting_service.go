package service

import (
	"context"

	"campus-flow/apps/services/reporting-service/internal/model"
	"campus-flow/apps/services/reporting-service/internal/repository"
)

type ReportingService struct {
	repo *repository.ReportingRepository
}

func NewReportingService(repo *repository.ReportingRepository) *ReportingService {
	return &ReportingService{
		repo: repo,
	}
}

func (s *ReportingService) GetAcademicDashboard(
	ctx context.Context,
) (*model.AcademicDashboard, error) {
	return s.repo.GetAcademicDashboard(ctx)
}

func (s *ReportingService) GetSupervisorDashboard(
	ctx context.Context,
) (*model.SupervisorDashboard, error) {
	return s.repo.GetSupervisorDashboard(ctx)
}
