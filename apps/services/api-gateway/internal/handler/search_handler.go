package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	"campus-flow/apps/services/api-gateway/internal/middleware"
	academicv1 "campus-flow/proto/gen/academic/v1"
	authv1 "campus-flow/proto/gen/auth/v1"
)

type SearchHandler struct {
	authClient     *client.AuthClient
	academicClient *client.AcademicClient
}

func NewSearchHandler(
	authClient *client.AuthClient,
	academicClient *client.AcademicClient,
) *SearchHandler {
	return &SearchHandler{
		authClient:     authClient,
		academicClient: academicClient,
	}
}

type SearchResultItem struct {
	Type  string `json:"type"`
	ID    string `json:"id"`
	Title string `json:"title"`
	Sub   string `json:"sub"`
	Href  string `json:"href"`
}

func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Success: false, Message: "method not allowed"})
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" || len(q) < 2 {
		writeJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Message: "search results",
			Data:    map[string]interface{}{"items": []SearchResultItem{}},
		})
		return
	}

	role, _ := middleware.GetRole(r.Context())

	ctx, cancel := context.WithTimeout(r.Context(), 4*time.Second)
	defer cancel()

	var (
		mu      sync.Mutex
		results []SearchResultItem
		wg      sync.WaitGroup
	)

	// Search academic requests by title / request_number.
	wg.Add(1)
	go func() {
		defer wg.Done()
		res, err := h.academicClient.Client.ListAllAcademicRequests(ctx, &academicv1.ListAllAcademicRequestsRequest{})
		if err != nil || res == nil {
			return
		}
		qLower := strings.ToLower(q)
		var matched []SearchResultItem
		for _, req := range res.Requests {
			if strings.Contains(strings.ToLower(req.Title), qLower) ||
				strings.Contains(strings.ToLower(req.RequestNumber), qLower) {
				matched = append(matched, SearchResultItem{
					Type:  "academic_request",
					ID:    req.Id,
					Title: req.Title,
					Sub:   req.RequestNumber + " · " + req.Status,
					Href:  "/admin/academic-requests?status=",
				})
			}
			if len(matched) >= 10 {
				break
			}
		}
		mu.Lock()
		results = append(results, matched...)
		mu.Unlock()
	}()

	// Search users (only for SUPER_ADMIN / ADMIN_PRODI).
	if role == "SUPER_ADMIN" || role == "ADMIN_PRODI" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			res, err := h.authClient.Client.ListUsers(ctx, &authv1.ListUsersRequest{
				Search: q,
			})
			if err != nil || res == nil {
				return
			}
			var matched []SearchResultItem
			for _, u := range res.Users {
				matched = append(matched, SearchResultItem{
					Type:  "user",
					ID:    u.Id,
					Title: u.FullName,
					Sub:   u.Email + " · " + u.Role,
					Href:  "/admin/users",
				})
				if len(matched) >= 10 {
					break
				}
			}
			mu.Lock()
			results = append(results, matched...)
			mu.Unlock()
		}()
	}

	// Search students by NIM / name.
	wg.Add(1)
	go func() {
		defer wg.Done()
		res, err := h.academicClient.Client.ListStudents(ctx, &academicv1.ListStudentsRequest{
			Search: q,
		})
		if err != nil || res == nil {
			return
		}
		var matched []SearchResultItem
		for _, s := range res.Students {
			matched = append(matched, SearchResultItem{
				Type:  "student",
				ID:    s.Id,
				Title: s.FullName,
				Sub:   s.Nim + " · " + s.DepartmentName,
				Href:  "/admin/students",
			})
			if len(matched) >= 10 {
				break
			}
		}
		mu.Lock()
		results = append(results, matched...)
		mu.Unlock()
	}()

	// Search lecturers by NIDN / name.
	wg.Add(1)
	go func() {
		defer wg.Done()
		res, err := h.academicClient.Client.ListAllLecturers(ctx, &academicv1.ListAllLecturersRequest{
			Search: q,
		})
		if err != nil || res == nil {
			return
		}
		var matched []SearchResultItem
		for _, l := range res.Lecturers {
			matched = append(matched, SearchResultItem{
				Type:  "lecturer",
				ID:    l.Id,
				Title: l.FullName,
				Sub:   l.Nidn + " · " + l.DepartmentName,
				Href:  "/admin/lecturers",
			})
			if len(matched) >= 10 {
				break
			}
		}
		mu.Lock()
		results = append(results, matched...)
		mu.Unlock()
	}()

	wg.Wait()

	if results == nil {
		results = []SearchResultItem{}
	}

	// Cap total results.
	if len(results) > 30 {
		results = results[:30]
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Message: "search results",
		Data:    map[string]interface{}{"items": results},
	})
}
