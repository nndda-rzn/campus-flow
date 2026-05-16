package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	authv1 "campus-flow/proto/gen/auth/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// BE-03-01: package-level regex untuk performa optimal
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// BE-03-03: daftar role yang valid
var validRoles = map[string]bool{
	"MAHASISWA":   true,
	"DOSEN":       true,
	"ADMIN_PRODI": true,
	"KAPRODI":     true,
	"TATA_USAHA":  true,
	"SUPER_ADMIN": true,
}

type AuthHandler struct {
	authClient *client.AuthClient
}

func NewAuthHandler(authClient *client.AuthClient) *AuthHandler {
	return &AuthHandler{
		authClient: authClient,
	}
}

type RefreshTokenHTTPBody struct {
	RefreshToken string `json:"refresh_token"`
}

type ValidateTokenHTTPBody struct {
	AccessToken string `json:"access_token"`
}

type LogoutHTTPBody struct {
	RefreshToken string `json:"refresh_token"`
}

type LoginHTTPBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterHTTPBody struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	var body LoginHTTPBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "invalid request body",
		})
		return
	}

	// BE-03: Trim input
	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	body.Password = strings.TrimSpace(body.Password)

	if body.Email == "" || body.Password == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "email and password are required",
		})
		return
	}

	// BE-03: Validasi format email
	if !emailRegex.MatchString(body.Email) {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "format email tidak valid",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.authClient.Client.Login(ctx, &authv1.LoginRequest{
		Email:    body.Email,
		Password: body.Password,
	})
	if err != nil {
		st, _ := status.FromError(err)
		switch st.Code() {
		case codes.Unauthenticated:
			writeJSON(w, http.StatusUnauthorized, APIResponse{
				Success: false,
				Message: "email atau password salah",
			})
		case codes.PermissionDenied:
			writeJSON(w, http.StatusForbidden, APIResponse{
				Success: false,
				Message: "akun tidak aktif",
			})
		default:
			writeJSON(w, http.StatusBadGateway, APIResponse{
				Success: false,
				Message: "failed to call auth service",
			})
		}
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "login success",
		Data:    res,
	})
}

func writeJSON(w http.ResponseWriter, statusCode int, payload APIResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	var body RegisterHTTPBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "invalid request body",
		})
		return
	}

	// BE-03: Trim semua input
	body.FullName = strings.TrimSpace(body.FullName)
	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	body.Password = strings.TrimSpace(body.Password)
	body.Role = strings.TrimSpace(strings.ToUpper(body.Role))

	if body.FullName == "" || body.Email == "" || body.Password == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "full_name, email, and password are required",
		})
		return
	}

	// BE-03-01: Validasi format email dengan regex
	if !emailRegex.MatchString(body.Email) {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "format email tidak valid",
		})
		return
	}

	// BE-03-02: Validasi panjang password minimal 8 karakter
	if len(body.Password) < 8 {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "password minimal 8 karakter",
		})
		return
	}

	// BE-03-03: Validasi role yang valid (jika tidak kosong)
	if body.Role != "" && !validRoles[body.Role] {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "role tidak valid, gunakan: MAHASISWA, DOSEN, ADMIN_PRODI, KAPRODI, TATA_USAHA, SUPER_ADMIN",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.authClient.Client.Register(ctx, &authv1.RegisterRequest{
		FullName: body.FullName,
		Email:    body.Email,
		Password: body.Password,
		Role:     body.Role,
	})
	if err != nil {
		st, _ := status.FromError(err)
		switch st.Code() {
		case codes.AlreadyExists:
			writeJSON(w, http.StatusConflict, APIResponse{
				Success: false,
				Message: "email sudah terdaftar",
			})
		case codes.InvalidArgument:
			writeJSON(w, http.StatusBadRequest, APIResponse{
				Success: false,
				Message: st.Message(),
			})
		default:
			writeJSON(w, http.StatusBadGateway, APIResponse{
				Success: false,
				Message: "failed to call auth service",
			})
		}
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: "register success",
		Data:    res,
	})
}

func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	var body RefreshTokenHTTPBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "invalid request body",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.authClient.Client.RefreshToken(ctx, &authv1.RefreshTokenRequest{
		RefreshToken: body.RefreshToken,
	})
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "invalid refresh token",
		})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "refresh token success",
		Data:    res,
	})
}

func (h *AuthHandler) ValidateToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	var body ValidateTokenHTTPBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "invalid request body",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.authClient.Client.ValidateToken(ctx, &authv1.ValidateTokenRequest{
		AccessToken: body.AccessToken,
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to call auth service",
		})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "validate token success",
		Data:    res,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	var body LogoutHTTPBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "invalid request body",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.authClient.Client.Logout(ctx, &authv1.LogoutRequest{
		RefreshToken: body.RefreshToken,
	})
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "invalid refresh token",
		})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "logout success",
		Data:    res,
	})
}
