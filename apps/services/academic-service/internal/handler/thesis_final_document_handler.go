package handler

import (
	"context"
	"errors"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/service"
	academicv1 "campus-flow/proto/gen/academic/v1"
)

type ThesisFinalDocumentHandler struct {
	svc *service.ThesisFinalDocumentService
}

func NewThesisFinalDocumentHandler(svc *service.ThesisFinalDocumentService) *ThesisFinalDocumentHandler {
	return &ThesisFinalDocumentHandler{svc: svc}
}

func (h *ThesisFinalDocumentHandler) ListLecturerFinalDocuments(
	ctx context.Context,
	req *academicv1.ListLecturerFinalDocumentsRequest,
) (*academicv1.ListThesisFinalDocumentsResponse, error) {
	if req.LecturerUserId == "" {
		return nil, status.Error(codes.InvalidArgument, "lecturer_user_id is required")
	}

	docs, total, err := h.svc.ListByLecturer(ctx, req.LecturerUserId, req.StatusFilter, int(req.Page), int(req.PageSize))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list documents: %v", err)
	}

	return &academicv1.ListThesisFinalDocumentsResponse{
		Documents:  h.mapDocuments(docs),
		TotalCount: int32(total),
		Page:       req.Page,
		PageSize:   req.PageSize,
	}, nil
}

func (h *ThesisFinalDocumentHandler) GetThesisFinalDocument(
	ctx context.Context,
	req *academicv1.GetThesisFinalDocumentRequest,
) (*academicv1.ThesisFinalDocumentResponse, error) {
	if req.DocumentId == "" {
		return nil, status.Error(codes.InvalidArgument, "document_id is required")
	}

	doc, err := h.svc.GetByID(ctx, req.DocumentId)
	if err != nil {
		return nil, h.mapError(err)
	}

	return &academicv1.ThesisFinalDocumentResponse{Document: h.mapDocument(doc)}, nil
}

func (h *ThesisFinalDocumentHandler) StartFinalDocumentReview(
	ctx context.Context,
	req *academicv1.FinalDocumentActionRequest,
) (*academicv1.ThesisFinalDocumentResponse, error) {
	if req.DocumentId == "" || req.LecturerUserId == "" {
		return nil, status.Error(codes.InvalidArgument, "document_id and lecturer_user_id are required")
	}

	doc, err := h.svc.StartReview(ctx, req.DocumentId, req.LecturerUserId)
	if err != nil {
		return nil, h.mapError(err)
	}

	return &academicv1.ThesisFinalDocumentResponse{Document: h.mapDocument(doc)}, nil
}

func (h *ThesisFinalDocumentHandler) ApproveFinalDocument(
	ctx context.Context,
	req *academicv1.FinalDocumentActionRequest,
) (*academicv1.ThesisFinalDocumentResponse, error) {
	if req.DocumentId == "" || req.LecturerUserId == "" {
		return nil, status.Error(codes.InvalidArgument, "document_id and lecturer_user_id are required")
	}

	doc, err := h.svc.Approve(ctx, req.DocumentId, req.LecturerUserId, req.Notes)
	if err != nil {
		return nil, h.mapError(err)
	}

	return &academicv1.ThesisFinalDocumentResponse{Document: h.mapDocument(doc)}, nil
}

func (h *ThesisFinalDocumentHandler) RequestRevisionFinalDocument(
	ctx context.Context,
	req *academicv1.FinalDocumentActionRequest,
) (*academicv1.ThesisFinalDocumentResponse, error) {
	if req.DocumentId == "" || req.LecturerUserId == "" {
		return nil, status.Error(codes.InvalidArgument, "document_id and lecturer_user_id are required")
	}

	doc, err := h.svc.RequestRevision(ctx, req.DocumentId, req.LecturerUserId, req.Notes)
	if err != nil {
		return nil, h.mapError(err)
	}

	return &academicv1.ThesisFinalDocumentResponse{Document: h.mapDocument(doc)}, nil
}

func (h *ThesisFinalDocumentHandler) RejectFinalDocument(
	ctx context.Context,
	req *academicv1.FinalDocumentActionRequest,
) (*academicv1.ThesisFinalDocumentResponse, error) {
	if req.DocumentId == "" || req.LecturerUserId == "" {
		return nil, status.Error(codes.InvalidArgument, "document_id and lecturer_user_id are required")
	}

	doc, err := h.svc.Reject(ctx, req.DocumentId, req.LecturerUserId, req.Notes)
	if err != nil {
		return nil, h.mapError(err)
	}

	return &academicv1.ThesisFinalDocumentResponse{Document: h.mapDocument(doc)}, nil
}

func (h *ThesisFinalDocumentHandler) mapDocuments(docs []model.ThesisFinalDocument) []*academicv1.ThesisFinalDocumentItem {
	items := make([]*academicv1.ThesisFinalDocumentItem, len(docs))
	for i := range docs {
		items[i] = h.mapDocument(&docs[i])
	}
	return items
}

func (h *ThesisFinalDocumentHandler) mapDocument(d *model.ThesisFinalDocument) *academicv1.ThesisFinalDocumentItem {
	item := &academicv1.ThesisFinalDocumentItem{
		Id:                  d.ID,
		SupervisorRequestId: d.SupervisorRequestID,
		StudentUserId:       d.StudentUserID,
		LecturerUserId:      d.LecturerUserID,
		DocumentType:        d.DocumentType,
		Title:               d.Title,
		FileId:              d.FileID,
		Filename:            d.Filename,
		Version:             int32(d.Version),
		Status:              d.Status,
		SubmittedAt:         d.SubmittedAt.Format(time.RFC3339),
		LecturerNotes:       d.LecturerNotes,
		RejectionReason:     d.RejectionReason,
		CreatedAt:           d.CreatedAt.Format(time.RFC3339),
		UpdatedAt:           d.UpdatedAt.Format(time.RFC3339),
		StudentName:         d.StudentName,
		StudentNim:          d.StudentNIM,
		LecturerName:        d.LecturerName,
		TopicTitle:          d.TopicTitle,
	}
	if d.ReviewedAt != nil {
		item.ReviewedAt = d.ReviewedAt.Format(time.RFC3339)
	}
	if d.ApprovedAt != nil {
		item.ApprovedAt = d.ApprovedAt.Format(time.RFC3339)
	}
	return item
}

func (h *ThesisFinalDocumentHandler) mapError(err error) error {
	if errors.Is(err, service.ErrThesisFinalDocNotFound) {
		return status.Error(codes.NotFound, err.Error())
	}
	if errors.Is(err, service.ErrInvalidDocumentTransition) {
		return status.Error(codes.FailedPrecondition, err.Error())
	}
	if errors.Is(err, service.ErrNotDocumentLecturer) {
		return status.Error(codes.PermissionDenied, err.Error())
	}
	return status.Errorf(codes.Internal, "internal error: %v", err)
}
