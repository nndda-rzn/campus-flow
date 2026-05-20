package handler

import (
	"context"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
	"campus-flow/apps/services/academic-service/internal/service"
	academicv1 "campus-flow/proto/gen/academic/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type NoteTemplateHandler struct {
	svc *service.NoteTemplateService
}

func NewNoteTemplateHandler(svc *service.NoteTemplateService) *NoteTemplateHandler {
	return &NoteTemplateHandler{svc: svc}
}

func toProtoNoteTemplate(t *model.NoteTemplate) *academicv1.NoteTemplateItem {
	return &academicv1.NoteTemplateItem{
		Id:              t.ID,
		DepartmentId:    t.DepartmentID,
		Category:        t.Category,
		Title:           t.Title,
		Body:            t.Body,
		UsageCount:      t.UsageCount,
		IsActive:        t.IsActive,
		CreatedByUserId: t.CreatedByUserID,
		CreatedAt:       t.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:       t.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}

func mapNoteTemplateError(err error) error {
	if err == repository.ErrNoteTemplateNotFound {
		return status.Error(codes.NotFound, "note template not found")
	}
	return status.Error(codes.Internal, err.Error())
}

func (h *NoteTemplateHandler) ListNoteTemplates(
	ctx context.Context,
	req *academicv1.ListNoteTemplatesRequest,
) (*academicv1.ListNoteTemplatesResponse, error) {
	templates, err := h.svc.List(ctx, req.DepartmentId, req.Category)
	if err != nil {
		return nil, mapNoteTemplateError(err)
	}
	out := make([]*academicv1.NoteTemplateItem, 0, len(templates))
	for _, t := range templates {
		copy := t
		out = append(out, toProtoNoteTemplate(&copy))
	}
	return &academicv1.ListNoteTemplatesResponse{Templates: out}, nil
}

func (h *NoteTemplateHandler) CreateNoteTemplate(
	ctx context.Context,
	req *academicv1.CreateNoteTemplateRequest,
) (*academicv1.NoteTemplateResponse, error) {
	if req.Title == "" || req.Body == "" || req.Category == "" {
		return nil, status.Error(codes.InvalidArgument, "title, body, and category are required")
	}
	t, err := h.svc.Create(ctx, req.DepartmentId, req.Category, req.Title, req.Body, req.CreatedByUserId)
	if err != nil {
		return nil, mapNoteTemplateError(err)
	}
	return &academicv1.NoteTemplateResponse{Template: toProtoNoteTemplate(t)}, nil
}

func (h *NoteTemplateHandler) UpdateNoteTemplate(
	ctx context.Context,
	req *academicv1.UpdateNoteTemplateRequest,
) (*academicv1.NoteTemplateResponse, error) {
	if req.Id == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}
	t, err := h.svc.Update(ctx, req.Id, req.Title, req.Body, req.Category)
	if err != nil {
		return nil, mapNoteTemplateError(err)
	}
	return &academicv1.NoteTemplateResponse{Template: toProtoNoteTemplate(t)}, nil
}

func (h *NoteTemplateHandler) DeleteNoteTemplate(
	ctx context.Context,
	req *academicv1.DeleteNoteTemplateRequest,
) (*academicv1.DeleteNoteTemplateResponse, error) {
	if req.Id == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}
	err := h.svc.Delete(ctx, req.Id)
	if err != nil {
		return nil, mapNoteTemplateError(err)
	}
	return &academicv1.DeleteNoteTemplateResponse{Success: true}, nil
}

func (h *NoteTemplateHandler) IncrementTemplateUsage(
	ctx context.Context,
	req *academicv1.IncrementTemplateUsageRequest,
) (*academicv1.NoteTemplateResponse, error) {
	if req.Id == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}
	t, err := h.svc.IncrementUsage(ctx, req.Id)
	if err != nil {
		return nil, mapNoteTemplateError(err)
	}
	return &academicv1.NoteTemplateResponse{Template: toProtoNoteTemplate(t)}, nil
}
