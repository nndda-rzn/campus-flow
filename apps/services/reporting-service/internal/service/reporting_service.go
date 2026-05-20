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

func (s *ReportingService) GetAdminOperationalDashboard(
	ctx context.Context,
) (*model.AdminOperationalDashboard, error) {
	return s.repo.GetAdminOperationalDashboard(ctx)
}

func (s *ReportingService) GetSLAAtRiskRequests(
	ctx context.Context,
	limit int32,
) ([]model.SLAAtRiskItem, error) {
	return s.repo.GetSLAAtRiskRequests(ctx, limit)
}

func (s *ReportingService) GetRequestTrends(
	ctx context.Context,
	startDate, endDate, granularity string,
) ([]model.TrendDataPoint, error) {
	return s.repo.GetRequestTrends(ctx, startDate, endDate, granularity)
}

func (s *ReportingService) GetProcessingTimeReport(
	ctx context.Context,
	startDate, endDate string,
) (*model.ProcessingTimeReport, error) {
	return s.repo.GetProcessingTimeReport(ctx, startDate, endDate)
}
