package handler

import (
	"context"

	"campus-flow/apps/services/reporting-service/internal/model"
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
	filter := model.DashboardFilter{
		StartDate: req.StartDate,
		EndDate:   req.EndDate,
	}

	dashboard, err := h.reportingService.GetAcademicDashboard(ctx, filter)
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

func (h *ReportingHandler) GetSupervisorDashboard(
	ctx context.Context,
	req *reportingv1.GetSupervisorDashboardRequest,
) (*reportingv1.SupervisorDashboardResponse, error) {
	filter := model.DashboardFilter{
		StartDate: req.StartDate,
		EndDate:   req.EndDate,
	}

	dashboard, err := h.reportingService.GetSupervisorDashboard(ctx, filter)
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

	return &reportingv1.SupervisorDashboardResponse{
		TotalRequests:     dashboard.TotalRequests,
		SubmittedRequests: dashboard.SubmittedRequests,
		VerifiedRequests:  dashboard.VerifiedRequests,
		AssignedRequests:  dashboard.AssignedRequests,
		AcceptedRequests:  dashboard.AcceptedRequests,
		RejectedRequests:  dashboard.RejectedRequests,
		CompletedRequests: dashboard.CompletedRequests,
		StatusCounts:      statusCounts,
	}, nil
}

func (h *ReportingHandler) GetLecturerWorkload(
	ctx context.Context,
	_ *reportingv1.GetLecturerWorkloadRequest,
) (*reportingv1.LecturerWorkloadResponse, error) {
	items, err := h.reportingService.GetLecturerWorkload(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	out := make([]*reportingv1.LecturerWorkloadItem, 0, len(items))
	for _, it := range items {
		out = append(out, &reportingv1.LecturerWorkloadItem{
			LecturerId:     it.LecturerID,
			LecturerUserId: it.LecturerUserID,
			LecturerName:   it.LecturerName,
			ActiveCount:    it.ActiveCount,
			AssignedCount:  it.AssignedCount,
			AcceptedCount:  it.AcceptedCount,
			CompletedCount: it.CompletedCount,
			RejectedCount:  it.RejectedCount,
		})
	}

	return &reportingv1.LecturerWorkloadResponse{Items: out}, nil
}

func (h *ReportingHandler) GetAdminOperationalDashboard(
	ctx context.Context,
	_ *reportingv1.GetAdminOperationalDashboardRequest,
) (*reportingv1.AdminOperationalDashboardResponse, error) {
	dashboard, err := h.reportingService.GetAdminOperationalDashboard(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	dailyCounts := make([]*reportingv1.DailyCount, 0, len(dashboard.RequestsByDay))
	for _, dc := range dashboard.RequestsByDay {
		dailyCounts = append(dailyCounts, &reportingv1.DailyCount{
			Date:  dc.Date,
			Count: dc.Count,
		})
	}

	return &reportingv1.AdminOperationalDashboardResponse{
		PendingVerificationCount: dashboard.PendingVerificationCount,
		SlaAtRiskCount:           dashboard.SLAAtRiskCount,
		SlaBreachedCount:         dashboard.SLABreachedCount,
		AvgVerificationTimeHours: dashboard.AvgVerificationTimeHours,
		WeeklyThroughput:         dashboard.WeeklyThroughput,
		RequestsByDay:            dailyCounts,
	}, nil
}

func (h *ReportingHandler) GetSLAAtRiskRequests(
	ctx context.Context,
	req *reportingv1.GetSLAAtRiskRequestsRequest,
) (*reportingv1.SLAAtRiskRequestsResponse, error) {
	items, err := h.reportingService.GetSLAAtRiskRequests(ctx, req.Limit)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	out := make([]*reportingv1.SLAAtRiskItem, 0, len(items))
	for _, it := range items {
		out = append(out, &reportingv1.SLAAtRiskItem{
			RequestId:      it.RequestID,
			RequestNumber:  it.RequestNumber,
			Title:          it.Title,
			StudentUserId:  it.StudentUserID,
			Status:         it.Status,
			DueAt:          it.DueAt,
			CreatedAt:      it.CreatedAt,
			HoursRemaining: it.HoursRemaining,
		})
	}

	return &reportingv1.SLAAtRiskRequestsResponse{Items: out}, nil
}

func (h *ReportingHandler) GetRequestTrends(
	ctx context.Context,
	req *reportingv1.GetRequestTrendsRequest,
) (*reportingv1.RequestTrendsResponse, error) {
	points, err := h.reportingService.GetRequestTrends(ctx, req.StartDate, req.EndDate, req.Granularity)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	out := make([]*reportingv1.TrendDataPoint, 0, len(points))
	for _, p := range points {
		out = append(out, &reportingv1.TrendDataPoint{
			Period:         p.Period,
			SubmittedCount: p.SubmittedCount,
			VerifiedCount:  p.VerifiedCount,
			ApprovedCount:  p.ApprovedCount,
			CompletedCount: p.CompletedCount,
			RejectedCount:  p.RejectedCount,
		})
	}

	return &reportingv1.RequestTrendsResponse{DataPoints: out}, nil
}

func (h *ReportingHandler) GetProcessingTimeReport(
	ctx context.Context,
	req *reportingv1.GetProcessingTimeReportRequest,
) (*reportingv1.ProcessingTimeReportResponse, error) {
	report, err := h.reportingService.GetProcessingTimeReport(ctx, req.StartDate, req.EndDate)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &reportingv1.ProcessingTimeReportResponse{
		AvgSubmissionToVerificationHours: report.AvgSubmissionToVerificationHours,
		AvgVerificationToApprovalHours:   report.AvgVerificationToApprovalHours,
		AvgApprovalToCompletionHours:     report.AvgApprovalToCompletionHours,
		AvgTotalProcessingHours:          report.AvgTotalProcessingHours,
		P90TotalHours:                    report.P90TotalHours,
	}, nil
}
