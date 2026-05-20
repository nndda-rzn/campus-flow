package handler

import (
	"context"
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	reportingv1 "campus-flow/proto/gen/reporting/v1"
)

type ReportingHandler struct {
	reportingClient *client.ReportingClient
}

func NewReportingHandler(reportingClient *client.ReportingClient) *ReportingHandler {
	return &ReportingHandler{
		reportingClient: reportingClient,
	}
}

func (h *ReportingHandler) GetAcademicDashboard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.reportingClient.Client.GetAcademicDashboard(ctx, &reportingv1.GetAcademicDashboardRequest{
		StartDate: r.URL.Query().Get("start_date"),
		EndDate:   r.URL.Query().Get("end_date"),
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to get academic dashboard",
		})
		return
	}

	if r.URL.Query().Get("format") == "csv" {
		writeAcademicDashboardCSV(w, res)
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "get academic dashboard success",
		Data:    res,
	})
}

func (h *ReportingHandler) GetSupervisorDashboard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.reportingClient.Client.GetSupervisorDashboard(ctx, &reportingv1.GetSupervisorDashboardRequest{
		StartDate: r.URL.Query().Get("start_date"),
		EndDate:   r.URL.Query().Get("end_date"),
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to get supervisor dashboard",
		})
		return
	}

	if r.URL.Query().Get("format") == "csv" {
		writeSupervisorDashboardCSV(w, res)
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "get supervisor dashboard success",
		Data:    res,
	})
}

func (h *ReportingHandler) GetLecturerWorkload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.reportingClient.Client.GetLecturerWorkload(ctx, &reportingv1.GetLecturerWorkloadRequest{})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to get lecturer workload",
		})
		return
	}

	if r.URL.Query().Get("format") == "csv" {
		writeLecturerWorkloadCSV(w, res)
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "get lecturer workload success",
		Data:    res,
	})
}

// ─── CSV serializers (FR-256) ────────────────────────────────────────────────

func setCSVHeader(w http.ResponseWriter, filename string) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition",
		fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.WriteHeader(http.StatusOK)
}

func writeAcademicDashboardCSV(w http.ResponseWriter, res *reportingv1.AcademicDashboardResponse) {
	setCSVHeader(w, "academic-requests-"+time.Now().Format("20060102")+".csv")
	cw := csv.NewWriter(w)
	defer cw.Flush()

	_ = cw.Write([]string{"metric", "value"})
	_ = cw.Write([]string{"total_requests", strconv.FormatInt(res.TotalRequests, 10)})
	_ = cw.Write([]string{"submitted", strconv.FormatInt(res.SubmittedRequests, 10)})
	_ = cw.Write([]string{"verified", strconv.FormatInt(res.VerifiedRequests, 10)})
	_ = cw.Write([]string{"approved", strconv.FormatInt(res.ApprovedRequests, 10)})
	_ = cw.Write([]string{"rejected", strconv.FormatInt(res.RejectedRequests, 10)})
	_ = cw.Write([]string{"completed", strconv.FormatInt(res.CompletedRequests, 10)})
	_ = cw.Write([]string{"", ""})
	_ = cw.Write([]string{"status", "total"})
	for _, s := range res.StatusCounts {
		_ = cw.Write([]string{s.Status, strconv.FormatInt(s.Total, 10)})
	}
}

func writeSupervisorDashboardCSV(w http.ResponseWriter, res *reportingv1.SupervisorDashboardResponse) {
	setCSVHeader(w, "supervisor-requests-"+time.Now().Format("20060102")+".csv")
	cw := csv.NewWriter(w)
	defer cw.Flush()

	_ = cw.Write([]string{"metric", "value"})
	_ = cw.Write([]string{"total_requests", strconv.FormatInt(res.TotalRequests, 10)})
	_ = cw.Write([]string{"submitted", strconv.FormatInt(res.SubmittedRequests, 10)})
	_ = cw.Write([]string{"verified", strconv.FormatInt(res.VerifiedRequests, 10)})
	_ = cw.Write([]string{"assigned", strconv.FormatInt(res.AssignedRequests, 10)})
	_ = cw.Write([]string{"accepted", strconv.FormatInt(res.AcceptedRequests, 10)})
	_ = cw.Write([]string{"rejected", strconv.FormatInt(res.RejectedRequests, 10)})
	_ = cw.Write([]string{"completed", strconv.FormatInt(res.CompletedRequests, 10)})
	_ = cw.Write([]string{"", ""})
	_ = cw.Write([]string{"status", "total"})
	for _, s := range res.StatusCounts {
		_ = cw.Write([]string{s.Status, strconv.FormatInt(s.Total, 10)})
	}
}

func writeLecturerWorkloadCSV(w http.ResponseWriter, res *reportingv1.LecturerWorkloadResponse) {
	setCSVHeader(w, "lecturer-workload-"+time.Now().Format("20060102")+".csv")
	cw := csv.NewWriter(w)
	defer cw.Flush()

	_ = cw.Write([]string{
		"lecturer_id", "lecturer_user_id", "lecturer_name",
		"active", "assigned", "accepted", "completed", "rejected",
	})
	for _, it := range res.Items {
		_ = cw.Write([]string{
			it.LecturerId, it.LecturerUserId, it.LecturerName,
			strconv.FormatInt(it.ActiveCount, 10),
			strconv.FormatInt(it.AssignedCount, 10),
			strconv.FormatInt(it.AcceptedCount, 10),
			strconv.FormatInt(it.CompletedCount, 10),
			strconv.FormatInt(it.RejectedCount, 10),
		})
	}
}

func (h *ReportingHandler) GetAdminOperationalDashboard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.reportingClient.Client.GetAdminOperationalDashboard(ctx, &reportingv1.GetAdminOperationalDashboardRequest{})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to get admin dashboard"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "get admin operational dashboard success", Data: res})
}

func (h *ReportingHandler) GetSLAAtRiskRequests(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	limitStr := r.URL.Query().Get("limit")
	var limit int32 = 10
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 {
			limit = int32(v)
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.reportingClient.Client.GetSLAAtRiskRequests(ctx, &reportingv1.GetSLAAtRiskRequestsRequest{
		Limit: limit,
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to get SLA at-risk requests"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "get sla at-risk requests success", Data: res})
}

func (h *ReportingHandler) GetRequestTrends(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.reportingClient.Client.GetRequestTrends(ctx, &reportingv1.GetRequestTrendsRequest{
		StartDate:   r.URL.Query().Get("start_date"),
		EndDate:     r.URL.Query().Get("end_date"),
		Granularity: r.URL.Query().Get("granularity"),
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to get request trends"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "get request trends success", Data: res})
}

func (h *ReportingHandler) GetProcessingTimeReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.reportingClient.Client.GetProcessingTimeReport(ctx, &reportingv1.GetProcessingTimeReportRequest{
		StartDate: r.URL.Query().Get("start_date"),
		EndDate:   r.URL.Query().Get("end_date"),
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: "failed to get processing time report"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "get processing time report success", Data: res})
}
