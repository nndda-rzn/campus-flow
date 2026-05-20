package service

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

var (
	ErrCommentInvalid = errors.New("invalid comment payload")
)

func (s *AcademicService) ListRequestComments(
	ctx context.Context,
	requestType, requestID string,
) ([]model.RequestComment, error) {
	if strings.TrimSpace(requestID) == "" {
		return nil, ErrCommentInvalid
	}
	repo := repository.NewCommentRepository(s.repo.DB())
	items, err := repo.List(ctx, requestType, requestID)
	if errors.Is(err, repository.ErrInvalidCommentType) {
		return nil, ErrCommentInvalid
	}
	return items, err
}

func (s *AcademicService) CreateRequestComment(
	ctx context.Context,
	c model.RequestComment,
) (*model.RequestComment, error) {
	c.RequestID = strings.TrimSpace(c.RequestID)
	c.AuthorUserID = strings.TrimSpace(c.AuthorUserID)
	c.AuthorName = strings.TrimSpace(c.AuthorName)
	c.AuthorRole = strings.TrimSpace(c.AuthorRole)
	c.Body = strings.TrimSpace(c.Body)

	if c.RequestID == "" || c.AuthorUserID == "" || c.Body == "" {
		return nil, ErrCommentInvalid
	}
	if len(c.Body) > 4000 {
		return nil, ErrCommentInvalid
	}

	repo := repository.NewCommentRepository(s.repo.DB())
	created, err := repo.Create(ctx, c)
	if errors.Is(err, repository.ErrInvalidCommentType) {
		return nil, ErrCommentInvalid
	}
	return created, err
}

// ─── Bulk verify (FR-255) ───────────────────────────────────────────────────

type BulkVerifyResult struct {
	RequestID string
	Success   bool
	Error     string
}

// BulkVerifyAcademicRequests applies VerifyAcademicRequest per id with the
// same note. Partial failures are tolerated; result list mirrors the input
// order so the caller can render per-row outcomes.
func (s *AcademicService) BulkVerifyAcademicRequests(
	ctx context.Context,
	requestIDs []string,
	actorUserID string,
	note string,
) ([]BulkVerifyResult, error) {
	actorUserID = strings.TrimSpace(actorUserID)
	if actorUserID == "" || len(requestIDs) == 0 {
		return nil, ErrInvalidInput
	}

	results := make([]BulkVerifyResult, 0, len(requestIDs))
	for _, id := range requestIDs {
		id = strings.TrimSpace(id)
		if id == "" {
			results = append(results, BulkVerifyResult{
				RequestID: id,
				Success:   false,
				Error:     "empty request id",
			})
			continue
		}

		_, err := s.VerifyAcademicRequest(ctx, id, actorUserID, note)
		if err != nil {
			results = append(results, BulkVerifyResult{
				RequestID: id,
				Success:   false,
				Error:     err.Error(),
			})
			continue
		}
		results = append(results, BulkVerifyResult{
			RequestID: id,
			Success:   true,
		})
	}
	return results, nil
}

// ─── Bulk approve/reject (Kaprodi) ──────────────────────────────────────────

type BulkWorkflowResult struct {
	RequestID string
	Success   bool
	Error     string
}

// BulkApproveAcademicRequests applies ApproveAcademicRequest per id.
// Partial failures are tolerated; result list mirrors input order.
func (s *AcademicService) BulkApproveAcademicRequests(
	ctx context.Context,
	requestIDs []string,
	actorUserID string,
	note string,
) ([]BulkWorkflowResult, error) {
	actorUserID = strings.TrimSpace(actorUserID)
	if actorUserID == "" || len(requestIDs) == 0 {
		return nil, ErrInvalidInput
	}

	if strings.TrimSpace(note) == "" {
		note = "Pengajuan disetujui oleh Kaprodi."
	}

	results := make([]BulkWorkflowResult, 0, len(requestIDs))
	for _, id := range requestIDs {
		id = strings.TrimSpace(id)
		if id == "" {
			results = append(results, BulkWorkflowResult{
				RequestID: id,
				Success:   false,
				Error:     "empty request id",
			})
			continue
		}

		_, err := s.ApproveAcademicRequest(ctx, id, actorUserID, note)
		if err != nil {
			results = append(results, BulkWorkflowResult{
				RequestID: id,
				Success:   false,
				Error:     err.Error(),
			})
			continue
		}
		results = append(results, BulkWorkflowResult{
			RequestID: id,
			Success:   true,
		})
	}
	return results, nil
}

// BulkRejectAcademicRequests applies RejectAcademicRequest per id.
// Note is required for rejection.
func (s *AcademicService) BulkRejectAcademicRequests(
	ctx context.Context,
	requestIDs []string,
	actorUserID string,
	note string,
) ([]BulkWorkflowResult, error) {
	actorUserID = strings.TrimSpace(actorUserID)
	note = strings.TrimSpace(note)

	if actorUserID == "" || len(requestIDs) == 0 {
		return nil, ErrInvalidInput
	}
	if note == "" {
		return nil, ErrNoteRequired
	}

	results := make([]BulkWorkflowResult, 0, len(requestIDs))
	for _, id := range requestIDs {
		id = strings.TrimSpace(id)
		if id == "" {
			results = append(results, BulkWorkflowResult{
				RequestID: id,
				Success:   false,
				Error:     "empty request id",
			})
			continue
		}

		_, err := s.RejectAcademicRequest(ctx, id, actorUserID, note)
		if err != nil {
			results = append(results, BulkWorkflowResult{
				RequestID: id,
				Success:   false,
				Error:     err.Error(),
			})
			continue
		}
		results = append(results, BulkWorkflowResult{
			RequestID: id,
			Success:   true,
		})
	}
	return results, nil
}
