package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	authv1 "campus-flow/proto/gen/auth/v1"
)

type contextKey string

const (
	UserIDContextKey contextKey = "user_id"
	RoleContextKey   contextKey = "role"
)

type AuthMiddleware struct {
	authClient *client.AuthClient
}

func NewAuthMiddleware(authClient *client.AuthClient) *AuthMiddleware {
	return &AuthMiddleware{
		authClient: authClient,
	}
}

type ErrorResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func (m *AuthMiddleware) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		accessToken, ok := extractBearerToken(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "missing or invalid authorization header")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		res, err := m.authClient.Client.ValidateToken(ctx, &authv1.ValidateTokenRequest{
			AccessToken: accessToken,
		})
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid access token")
			return
		}

		if !res.Valid {
			writeError(w, http.StatusUnauthorized, "invalid access token")
			return
		}

		requestCtx := context.WithValue(r.Context(), UserIDContextKey, res.UserId)
		requestCtx = context.WithValue(requestCtx, RoleContextKey, res.Role)

		next.ServeHTTP(w, r.WithContext(requestCtx))
	})
}

func (m *AuthMiddleware) RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	allowed := map[string]bool{}

	for _, role := range allowedRoles {
		allowed[strings.ToUpper(strings.TrimSpace(role))] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role, ok := GetRole(r.Context())
			if !ok {
				writeError(w, http.StatusUnauthorized, "missing user role")
				return
			}

			role = strings.ToUpper(strings.TrimSpace(role))

			if !allowed[role] {
				writeError(w, http.StatusForbidden, "forbidden access")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func GetUserID(ctx context.Context) (string, bool) {
	value, ok := ctx.Value(UserIDContextKey).(string)
	return value, ok
}

func GetRole(ctx context.Context) (string, bool) {
	value, ok := ctx.Value(RoleContextKey).(string)
	return value, ok
}

func extractBearerToken(r *http.Request) (string, bool) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", false
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 {
		return "", false
	}

	if !strings.EqualFold(parts[0], "Bearer") {
		return "", false
	}

	token := strings.TrimSpace(parts[1])
	if token == "" {
		return "", false
	}

	return token, true
}

func writeError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	_ = json.NewEncoder(w).Encode(ErrorResponse{
		Success: false,
		Message: message,
	})
}