package handler

import (
	"context"
	"errors"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/service"
	academicv1 "campus-flow/proto/gen/academic/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func toProtoAnnouncement(a *model.Announcement) *academicv1.AnnouncementItem {
	endsAt := ""
	if a.EndsAt != nil {
		endsAt = a.EndsAt.Format("2006-01-02 15:04:05")
	}
	return &academicv1.AnnouncementItem{
		Id:           a.ID,
		Title:        a.Title,
		Body:         a.Body,
		Severity:     a.Severity,
		AuthorUserId: a.AuthorUserID,
		AuthorName:   a.AuthorName,
		TargetRoles:  a.TargetRoles,
		IsActive:     a.IsActive,
		StartsAt:     a.StartsAt.Format("2006-01-02 15:04:05"),
		EndsAt:       endsAt,
		CreatedAt:    a.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:    a.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}

func mapAnnouncementError(err error) error {
	if errors.Is(err, service.ErrAnnouncementInvalid) {
		return status.Error(codes.InvalidArgument, "invalid announcement payload")
	}
	if errors.Is(err, service.ErrAnnouncementNotFound) {
		return status.Error(codes.NotFound, "announcement not found")
	}
	return status.Error(codes.Internal, err.Error())
}

func (h *AcademicHandler) ListAnnouncements(
	ctx context.Context,
	req *academicv1.ListAnnouncementsRequest,
) (*academicv1.ListAnnouncementsResponse, error) {
	items, err := h.academicService.ListAnnouncements(ctx, req.ViewerRole, req.IncludeInactive)
	if err != nil {
		return nil, mapAnnouncementError(err)
	}
	out := make([]*academicv1.AnnouncementItem, 0, len(items))
	for _, it := range items {
		copy := it
		out = append(out, toProtoAnnouncement(&copy))
	}
	return &academicv1.ListAnnouncementsResponse{Items: out}, nil
}

func (h *AcademicHandler) CreateAnnouncement(
	ctx context.Context,
	req *academicv1.CreateAnnouncementRequest,
) (*academicv1.AnnouncementItemResponse, error) {
	a := model.Announcement{
		Title:        req.Title,
		Body:         req.Body,
		Severity:     req.Severity,
		AuthorUserID: req.AuthorUserId,
		AuthorName:   req.AuthorName,
		TargetRoles:  req.TargetRoles,
	}
	created, err := h.academicService.CreateAnnouncement(ctx, a)
	if err != nil {
		return nil, mapAnnouncementError(err)
	}
	return &academicv1.AnnouncementItemResponse{Announcement: toProtoAnnouncement(created)}, nil
}

func (h *AcademicHandler) UpdateAnnouncement(
	ctx context.Context,
	req *academicv1.UpdateAnnouncementRequest,
) (*academicv1.AnnouncementItemResponse, error) {
	a, err := h.academicService.UpdateAnnouncement(
		ctx,
		req.Id,
		req.Title,
		req.Body,
		req.Severity,
		req.TargetRoles,
		req.EndsAt,
	)
	if err != nil {
		return nil, mapAnnouncementError(err)
	}
	return &academicv1.AnnouncementItemResponse{Announcement: toProtoAnnouncement(a)}, nil
}

func (h *AcademicHandler) DeactivateAnnouncement(
	ctx context.Context,
	req *academicv1.DeactivateAnnouncementRequest,
) (*academicv1.AnnouncementItemResponse, error) {
	a, err := h.academicService.DeactivateAnnouncement(ctx, req.Id)
	if err != nil {
		return nil, mapAnnouncementError(err)
	}
	return &academicv1.AnnouncementItemResponse{Announcement: toProtoAnnouncement(a)}, nil
}
