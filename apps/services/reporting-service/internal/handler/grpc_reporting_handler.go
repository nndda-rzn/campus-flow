package handler

import (
	"context"

	"campus-flow/apps/services/reporting-service/internal/service"
	reportingv1 "campus-flow/proto/gen/reporting/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ReportingHandler struct {
	reportingv1.UnimplementedReportingServiceServer
	reportingService *service.ReportingService
}

func NewReportingHandler(reportingService *service.ReportingService) *ReportingHandler {
	return &ReportingHandler{
		reportingService: reportingService,
	}
}

func (h *ReportingHandler) GetAcademicDashboard(
	ctx context.Context,
	req *reportingv1.GetAcademicDashboardRequest,
) (*reportingv1.AcademicDashboardResponse, error) {
	dashboard, err := h.reportingService.GetAcademicDashboard(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	statusCounts := make([]*reportingv1.StatusCount, 0, len(dashboard.StatusCounts))
	for _, item := range dashboard.StatusCounts {
		statusCounts = append(statusCounts, &reportingv1.StatusCount{
			Status: item.Status,
			Total:  item.Total,
		})
	}

	return &reportingv1.AcademicDashboardResponse{
		TotalRequests:     dashboard.TotalRequests,
		SubmittedRequests: dashboard.SubmittedRequests,
		VerifiedRequests:  dashboard.VerifiedRequests,
		ApprovedRequests:  dashboard.ApprovedRequests,
		RejectedRequests:  dashboard.RejectedRequests,
		CompletedRequests: dashboard.CompletedRequests,
		StatusCounts:      statusCounts,
	}, nil
}