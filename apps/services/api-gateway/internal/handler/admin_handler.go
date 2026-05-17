package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	"campus-flow/apps/services/api-gateway/internal/middleware"
	academicv1 "campus-flow/proto/gen/academic/v1"
	authv1 "campus-flow/proto/gen/auth/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AdminHandler struct {
	authClient     *client.AuthClient
	academicClient *client.AcademicClient
}

func NewAdminHandler(
	authClient *client.AuthClient,
	academicClient *client.AcademicClient,
) *AdminHandler {
	return &AdminHandler{
		authClient:     authClient,
		academicClient: academicClient,
	}
}

// ─── Helpers ────────────────────────────────────────────────────────────────

func writeAdminError(w http.ResponseWriter, err error, fallbackMsg string) {
	st, ok := status.FromError(err)
	if !ok {
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: fallbackMsg})
		return
	}

	switch st.Code() {
	case codes.InvalidArgument:
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: st.Message()})
	case codes.NotFound:
		writeJSON(w, http.StatusNotFound, APIResponse{Success: false, Message: st.Message()})
	case codes.AlreadyExists:
		writeJSON(w, http.StatusConflict, APIResponse{Success: false, Message: st.Message()})
	case codes.PermissionDenied:
		writeJSON(w, http.StatusForbidden, APIResponse{Success: false, Message: st.Message()})
	case codes.FailedPrecondition:
		writeJSON(w, http.StatusConflict, APIResponse{Success: false, Message: st.Message()})
	default:
		writeJSON(w, http.StatusBadGateway, APIResponse{Success: false, Message: fallbackMsg})
	}
}

// ─── Users ──────────────────────────────────────────────────────────────────

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.authClient.Client.ListUsers(ctx, &authv1.ListUsersRequest{
		RoleFilter:   r.URL.Query().Get("role"),
		StatusFilter: r.URL.Query().Get("status"),
		Search:       r.URL.Query().Get("search"),
	})
	if err != nil {
		writeAdminError(w, err, "failed to list users")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "list users success", Data: res})
}

type UpdateUserHTTPBody struct {
	UserID   string `json:"user_id"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
}

func (h *AdminHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	var body UpdateUserHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.UserID) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "user_id is required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.authClient.Client.UpdateUser(ctx, &authv1.UpdateUserRequest{
		UserId:   body.UserID,
		FullName: body.FullName,
		Email:    body.Email,
	})
	if err != nil {
		writeAdminError(w, err, "failed to update user")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "update user success", Data: res})
}

type SetUserStatusHTTPBody struct {
	UserID string `json:"user_id"`
	Status string `json:"status"`
}

func (h *AdminHandler) SetUserStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	var body SetUserStatusHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.UserID) == "" || strings.TrimSpace(body.Status) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "user_id and status are required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.authClient.Client.SetUserStatus(ctx, &authv1.SetUserStatusRequest{
		UserId: body.UserID,
		Status: body.Status,
	})
	if err != nil {
		writeAdminError(w, err, "failed to set user status")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "set user status success", Data: res})
}

type AssignUserRoleHTTPBody struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

func (h *AdminHandler) AssignUserRole(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	actorID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Success: false, Message: "missing actor id"})
		return
	}

	var body AssignUserRoleHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.UserID) == "" || strings.TrimSpace(body.Role) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "user_id and role are required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.authClient.Client.AssignUserRole(ctx, &authv1.AssignUserRoleRequest{
		UserId:      body.UserID,
		Role:        body.Role,
		ActorUserId: actorID,
	})
	if err != nil {
		writeAdminError(w, err, "failed to assign user role")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "assign user role success", Data: res})
}

// ─── Departments ────────────────────────────────────────────────────────────

func (h *AdminHandler) ListDepartments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.ListDepartments(ctx, &academicv1.ListDepartmentsRequest{})
	if err != nil {
		writeAdminError(w, err, "failed to list departments")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "list departments success", Data: res})
}

type DepartmentHTTPBody struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}

func (h *AdminHandler) CreateDepartment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	var body DepartmentHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.Code) == "" || strings.TrimSpace(body.Name) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "code and name are required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.CreateDepartment(ctx, &academicv1.CreateDepartmentRequest{
		Code: body.Code,
		Name: body.Name,
	})
	if err != nil {
		writeAdminError(w, err, "failed to create department")
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Message: "create department success", Data: res})
}

func (h *AdminHandler) UpdateDepartment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	var body DepartmentHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.ID) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "id is required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.UpdateDepartment(ctx, &academicv1.UpdateDepartmentRequest{
		Id:   body.ID,
		Code: body.Code,
		Name: body.Name,
	})
	if err != nil {
		writeAdminError(w, err, "failed to update department")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "update department success", Data: res})
}

// ─── Students ───────────────────────────────────────────────────────────────

func (h *AdminHandler) ListStudents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.ListStudents(ctx, &academicv1.ListStudentsRequest{
		StatusFilter: r.URL.Query().Get("status"),
		Search:       r.URL.Query().Get("search"),
	})
	if err != nil {
		writeAdminError(w, err, "failed to list students")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "list students success", Data: res})
}

type UpsertStudentHTTPBody struct {
	UserID       string `json:"user_id"`
	NIM          string `json:"nim"`
	FullName     string `json:"full_name"`
	Email        string `json:"email"`
	DepartmentID string `json:"department_id"`
}

func (h *AdminHandler) UpsertStudent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	var body UpsertStudentHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.UserID) == "" || strings.TrimSpace(body.FullName) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "user_id and full_name are required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.UpsertStudent(ctx, &academicv1.UpsertStudentRequest{
		UserId:       body.UserID,
		Nim:          body.NIM,
		FullName:     body.FullName,
		Email:        body.Email,
		DepartmentId: body.DepartmentID,
	})
	if err != nil {
		writeAdminError(w, err, "failed to upsert student")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "upsert student success", Data: res})
}

type SetEntityStatusHTTPBody struct {
	UserID string `json:"user_id"`
	Status string `json:"status"`
}

func (h *AdminHandler) SetStudentStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	var body SetEntityStatusHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.UserID) == "" || strings.TrimSpace(body.Status) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "user_id and status are required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.SetStudentStatus(ctx, &academicv1.SetStudentStatusRequest{
		UserId: body.UserID,
		Status: body.Status,
	})
	if err != nil {
		writeAdminError(w, err, "failed to set student status")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "set student status success", Data: res})
}

// ─── Lecturers ──────────────────────────────────────────────────────────────

func (h *AdminHandler) ListAllLecturers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.ListAllLecturers(ctx, &academicv1.ListAllLecturersRequest{
		StatusFilter: r.URL.Query().Get("status"),
		Search:       r.URL.Query().Get("search"),
	})
	if err != nil {
		writeAdminError(w, err, "failed to list lecturers")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "list lecturers success", Data: res})
}

type UpsertLecturerHTTPBody struct {
	UserID             string `json:"user_id"`
	NIDN               string `json:"nidn"`
	FullName           string `json:"full_name"`
	Email              string `json:"email"`
	DepartmentID       string `json:"department_id"`
	MaxSupervisorQuota int32  `json:"max_supervisor_quota"`
}

func (h *AdminHandler) UpsertLecturer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	var body UpsertLecturerHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.UserID) == "" || strings.TrimSpace(body.FullName) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "user_id and full_name are required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.UpsertLecturer(ctx, &academicv1.UpsertLecturerRequest{
		UserId:             body.UserID,
		Nidn:               body.NIDN,
		FullName:           body.FullName,
		Email:              body.Email,
		DepartmentId:       body.DepartmentID,
		MaxSupervisorQuota: body.MaxSupervisorQuota,
	})
	if err != nil {
		writeAdminError(w, err, "failed to upsert lecturer")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "upsert lecturer success", Data: res})
}

func (h *AdminHandler) SetLecturerStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	var body SetEntityStatusHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "invalid request body"})
		return
	}
	if strings.TrimSpace(body.UserID) == "" || strings.TrimSpace(body.Status) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Success: false, Message: "user_id and status are required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.academicClient.Client.SetLecturerStatus(ctx, &academicv1.SetLecturerStatusRequest{
		UserId: body.UserID,
		Status: body.Status,
	})
	if err != nil {
		writeAdminError(w, err, "failed to set lecturer status")
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Message: "set lecturer status success", Data: res})
}
