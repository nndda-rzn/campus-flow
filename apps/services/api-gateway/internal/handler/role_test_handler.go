package handler

import "net/http"

type RoleTestHandler struct{}

func NewRoleTestHandler() *RoleTestHandler {
	return &RoleTestHandler{}
}

func (h *RoleTestHandler) StudentOnly(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "student endpoint access granted",
	})
}

func (h *RoleTestHandler) AdminOnly(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "admin endpoint access granted",
	})
}

func (h *RoleTestHandler) HeadOnly(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "kaprodi endpoint access granted",
	})
}