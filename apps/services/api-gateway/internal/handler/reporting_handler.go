package handler

import (
	"context"
	"net/http"
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

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "get lecturer workload success",
		Data:    res,
	})
}
