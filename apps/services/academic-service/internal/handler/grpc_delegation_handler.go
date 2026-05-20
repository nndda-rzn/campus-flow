package handler

import (
	"context"
	"time"

	"campus-flow/apps/services/academic-service/internal/repository"
	"campus-flow/apps/services/academic-service/internal/service"
	academicv1 "campus-flow/proto/gen/academic/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func toProtoDelegation(d *repository.Delegation) *academicv1.DelegationItem {
	item := &academicv1.DelegationItem{
		Id:              d.ID,
		DelegatorUserId: d.DelegatorUserID,
		DelegateUserId:  d.DelegateUserID,
		DelegateName:    d.DelegateName,
		Reason:          d.Reason,
		StartsAt:        d.StartsAt.Format(time.RFC3339),
		EndsAt:          d.EndsAt.Format(time.RFC3339),
		IsActive:        d.IsActive,
		CreatedAt:       d.CreatedAt.Format("2006-01-02 15:04:05"),
	}
	if d.RevokedAt != nil {
		item.RevokedAt = d.RevokedAt.Format("2006-01-02 15:04:05")
	}
	return item
}

func (h *AcademicHandler) ListDelegations(
	ctx context.Context,
	req *academicv1.ListDelegationsRequest,
) (*academicv1.ListDelegationsResponse, error) {
	items, err := h.academicService.ListDelegations(ctx, req.DelegatorUserId, req.IncludeExpired)
	if err != nil {
		return nil, mapDelegationError(err)
	}

	out := make([]*academicv1.DelegationItem, 0, len(items))
	for _, d := range items {
		d := d
		out = append(out, toProtoDelegation(&d))
	}
	return &academicv1.ListDelegationsResponse{Delegations: out}, nil
}

func (h *AcademicHandler) CreateDelegation(
	ctx context.Context,
	req *academicv1.CreateDelegationRequest,
) (*academicv1.DelegationResponse, error) {
	startsAt, err := time.Parse(time.RFC3339, req.StartsAt)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid starts_at format, use RFC3339")
	}
	endsAt, err := time.Parse(time.RFC3339, req.EndsAt)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid ends_at format, use RFC3339")
	}

	d, err := h.academicService.CreateDelegation(
		ctx, req.DelegatorUserId, req.DelegateUserId, req.DelegateName, req.Reason,
		startsAt, endsAt,
	)
	if err != nil {
		return nil, mapDelegationError(err)
	}
	return &academicv1.DelegationResponse{Delegation: toProtoDelegation(d)}, nil
}

func (h *AcademicHandler) RevokeDelegation(
	ctx context.Context,
	req *academicv1.RevokeDelegationRequest,
) (*academicv1.DelegationResponse, error) {
	d, err := h.academicService.RevokeDelegation(ctx, req.Id, req.ActorUserId)
	if err != nil {
		return nil, mapDelegationError(err)
	}
	return &academicv1.DelegationResponse{Delegation: toProtoDelegation(d)}, nil
}

func (h *AcademicHandler) CheckDelegation(
	ctx context.Context,
	req *academicv1.CheckDelegationRequest,
) (*academicv1.CheckDelegationResponse, error) {
	d, err := h.academicService.CheckDelegation(ctx, req.UserId)
	if err != nil {
		return nil, mapDelegationError(err)
	}
	if d == nil {
		return &academicv1.CheckDelegationResponse{HasActiveDelegation: false}, nil
	}
	return &academicv1.CheckDelegationResponse{
		HasActiveDelegation: true,
		DelegatorUserId:     d.DelegatorUserID,
		Delegation:          toProtoDelegation(d),
	}, nil
}

func mapDelegationError(err error) error {
	if err == service.ErrInvalidInput {
		return status.Error(codes.InvalidArgument, "invalid input")
	}
	if err == service.ErrDelegationOverlap {
		return status.Error(codes.AlreadyExists, "active delegation already exists for this period")
	}
	if err == service.ErrAcademicRequestNotFound {
		return status.Error(codes.NotFound, "delegation not found")
	}
	return status.Error(codes.Internal, err.Error())
}
