package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	academicv1 "campus-flow/proto/gen/academic/v1"
)

type BulkImportHandler struct {
	academicClient *client.AcademicClient
}

func NewBulkImportHandler(academicClient *client.AcademicClient) *BulkImportHandler {
	return &BulkImportHandler{academicClient: academicClient}
}

// ─── Students ───────────────────────────────────────────────────────────────

type StudentImportRowHTTP struct {
	UserID         string `json:"user_id"`
	Email          string `json:"email"`
	NIM            string `json:"nim"`
	FullName       string `json:"full_name"`
	DepartmentCode string `json:"department_code"`
}

type BulkImportStudentsHTTPBody struct {
	Rows   []StudentImportRowHTTP `json:"rows"`
	DryRun bool                   `json:"dry_run"`
}

func (h *BulkImportHandler) Students(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}
	var body BulkImportStudentsHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if len(body.Rows) == 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "rows kosong"})
		return
	}
	if len(body.Rows) > 1000 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "maksimal 1000 baris per batch"})
		return
	}

	rows := make([]*academicv1.StudentImportRow, 0, len(body.Rows))
	for _, r := range body.Rows {
		rows = append(rows, &academicv1.StudentImportRow{
			UserId:         r.UserID,
			Email:          r.Email,
			Nim:            r.NIM,
			FullName:       r.FullName,
			DepartmentCode: r.DepartmentCode,
		})
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.BulkImportStudents(ctx, &academicv1.BulkImportStudentsRequest{
		Rows:   rows,
		DryRun: body.DryRun,
	})
	if err != nil {
		writeAdminError(w, err, "failed to bulk import students")
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "bulk import students success", Data: res})
}

// ─── Lecturers ──────────────────────────────────────────────────────────────

type LecturerImportRowHTTP struct {
	UserID             string `json:"user_id"`
	Email              string `json:"email"`
	NIDN               string `json:"nidn"`
	FullName           string `json:"full_name"`
	DepartmentCode     string `json:"department_code"`
	MaxSupervisorQuota int32  `json:"max_supervisor_quota"`
}

type BulkImportLecturersHTTPBody struct {
	Rows   []LecturerImportRowHTTP `json:"rows"`
	DryRun bool                    `json:"dry_run"`
}

func (h *BulkImportHandler) Lecturers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}
	var body BulkImportLecturersHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if len(body.Rows) == 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "rows kosong"})
		return
	}
	if len(body.Rows) > 1000 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "maksimal 1000 baris per batch"})
		return
	}

	rows := make([]*academicv1.LecturerImportRow, 0, len(body.Rows))
	for _, r := range body.Rows {
		rows = append(rows, &academicv1.LecturerImportRow{
			UserId:             r.UserID,
			Email:              r.Email,
			Nidn:               r.NIDN,
			FullName:           r.FullName,
			DepartmentCode:     r.DepartmentCode,
			MaxSupervisorQuota: r.MaxSupervisorQuota,
		})
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.BulkImportLecturers(ctx, &academicv1.BulkImportLecturersRequest{
		Rows:   rows,
		DryRun: body.DryRun,
	})
	if err != nil {
		writeAdminError(w, err, "failed to bulk import lecturers")
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "bulk import lecturers success", Data: res})
}
