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
	filter model.DashboardFilter,
) (*model.AcademicDashboard, error) {
	return s.repo.GetAcademicDashboard(ctx, filter)
}

func (s *ReportingService) GetSupervisorDashboard(
	ctx context.Context,
	filter model.DashboardFilter,
) (*model.SupervisorDashboard, error) {
	return s.repo.GetSupervisorDashboard(ctx, filter)
}

func (s *ReportingService) GetLecturerWorkload(
	ctx context.Context,
) ([]model.LecturerWorkloadItem, error) {
	return s.repo.GetLecturerWorkload(ctx)
}
