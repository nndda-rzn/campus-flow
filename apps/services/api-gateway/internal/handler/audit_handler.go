package handler

import (
	"context"
	"net/http"
	"sort"
	"strconv"
	"sync"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	academicv1 "campus-flow/proto/gen/academic/v1"
	authv1 "campus-flow/proto/gen/auth/v1"
)

// AuditHandler aggregates audit logs from auth + academic services and
// returns them merged & sorted by created_at DESC.
type AuditHandler struct {
	authClient     *client.AuthClient
	academicClient *client.AcademicClient
}

func NewAuditHandler(
	authClient *client.AuthClient,
	academicClient *client.AcademicClient,
) *AuditHandler {
	return &AuditHandler{
		authClient:     authClient,
		academicClient: academicClient,
	}
}

type AuditLogResponseItem struct {
	ID            string `json:"id"`
	ActorUserID   string `json:"actor_user_id"`
	Action        string `json:"action"`
	EntityType    string `json:"entity_type"`
	EntityID      string `json:"entity_id"`
	MetadataJSON  string `json:"metadata_json"`
	CreatedAt     string `json:"created_at"`
	SourceService string `json:"source_service"`
}

func (h *AuditHandler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	q := r.URL.Query()
	actorUserID := q.Get("actor_user_id")
	action := q.Get("action")
	entityType := q.Get("entity_type")
	limit := 100
	if v, err := strconv.Atoi(q.Get("limit")); err == nil && v > 0 && v <= 500 {
		limit = v
	}

	ctx, cancel := context.WithTimeout(r.Context(), 6*time.Second)
	defer cancel()

	type fetchResult struct {
		items []AuditLogResponseItem
		err   error
	}

	authCh := make(chan fetchResult, 1)
	academicCh := make(chan fetchResult, 1)

	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		res, err := h.authClient.Client.ListAuditLogs(ctx, &authv1.ListAuditLogsRequest{
			ActorUserId: actorUserID,
			Action:      action,
			EntityType:  entityType,
			Limit:       int32(limit),
		})
		if err != nil {
			authCh <- fetchResult{err: err}
			return
		}
		out := make([]AuditLogResponseItem, 0, len(res.Items))
		for _, it := range res.Items {
			out = append(out, AuditLogResponseItem{
				ID:            it.Id,
				ActorUserID:   it.ActorUserId,
				Action:        it.Action,
				EntityType:    it.EntityType,
				EntityID:      it.EntityId,
				MetadataJSON:  it.MetadataJson,
				CreatedAt:     it.CreatedAt,
				SourceService: it.SourceService,
			})
		}
		authCh <- fetchResult{items: out}
	}()

	go func() {
		defer wg.Done()
		res, err := h.academicClient.Client.ListAuditLogs(ctx, &academicv1.ListAuditLogsRequest{
			ActorUserId: actorUserID,
			Action:      action,
			EntityType:  entityType,
			Limit:       int32(limit),
		})
		if err != nil {
			academicCh <- fetchResult{err: err}
			return
		}
		out := make([]AuditLogResponseItem, 0, len(res.Items))
		for _, it := range res.Items {
			out = append(out, AuditLogResponseItem{
				ID:            it.Id,
				ActorUserID:   it.ActorUserId,
				Action:        it.Action,
				EntityType:    it.EntityType,
				EntityID:      it.EntityId,
				MetadataJSON:  it.MetadataJson,
				CreatedAt:     it.CreatedAt,
				SourceService: it.SourceService,
			})
		}
		academicCh <- fetchResult{items: out}
	}()

	wg.Wait()
	close(authCh)
	close(academicCh)

	authRes := <-authCh
	academicRes := <-academicCh

	// Merge available results; tolerate per-service failure (partial response).
	merged := make([]AuditLogResponseItem, 0, len(authRes.items)+len(academicRes.items))
	if authRes.err == nil {
		merged = append(merged, authRes.items...)
	}
	if academicRes.err == nil {
		merged = append(merged, academicRes.items...)
	}

	// Sort merged by created_at DESC (string sort works for ISO-like format).
	sort.Slice(merged, func(i, j int) bool {
		return merged[i].CreatedAt > merged[j].CreatedAt
	})

	if limit > 0 && len(merged) > limit {
		merged = merged[:limit]
	}

	// If both upstreams failed, return 502.
	if authRes.err != nil && academicRes.err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to fetch audit logs from any service",
		})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "list audit logs success",
		Data: map[string]interface{}{
			"items":          merged,
			"auth_error":     errString(authRes.err),
			"academic_error": errString(academicRes.err),
		},
	})
}

func errString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
