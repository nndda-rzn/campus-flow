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

func toProtoAcademicYear(y *model.AcademicYear) *academicv1.AcademicYearItem {
	return &academicv1.AcademicYearItem{
		Id:        y.ID,
		Code:      y.Code,
		Name:      y.Name,
		StartDate: y.StartDate.Format("2006-01-02"),
		EndDate:   y.EndDate.Format("2006-01-02"),
		IsActive:  y.IsActive,
		CreatedAt: y.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: y.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}

func mapYearScopeError(err error) error {
	if errors.Is(err, service.ErrAcademicYearInvalid) {
		return status.Error(codes.InvalidArgument, "invalid academic year payload")
	}
	if errors.Is(err, service.ErrAcademicYearNotFound) {
		return status.Error(codes.NotFound, "academic year not found")
	}
	if errors.Is(err, service.ErrInvalidInput) {
		return status.Error(codes.InvalidArgument, "invalid input")
	}
	return status.Error(codes.Internal, err.Error())
}

func (h *AcademicHandler) ListAcademicYears(
	ctx context.Context,
	_ *academicv1.ListAcademicYearsRequest,
) (*academicv1.ListAcademicYearsResponse, error) {
	years, err := h.academicService.ListAcademicYears(ctx)
	if err != nil {
		return nil, mapYearScopeError(err)
	}
	out := make([]*academicv1.AcademicYearItem, 0, len(years))
	for _, y := range years {
		yCopy := y
		out = append(out, toProtoAcademicYear(&yCopy))
	}
	return &academicv1.ListAcademicYearsResponse{Items: out}, nil
}

func (h *AcademicHandler) GetActiveAcademicYear(
	ctx context.Context,
	_ *academicv1.GetActiveAcademicYearRequest,
) (*academicv1.AcademicYearResponse, error) {
	y, err := h.academicService.GetActiveAcademicYear(ctx)
	if err != nil {
		return nil, mapYearScopeError(err)
	}
	return &academicv1.AcademicYearResponse{Year: toProtoAcademicYear(y)}, nil
}

func (h *AcademicHandler) CreateAcademicYear(
	ctx context.Context,
	req *academicv1.CreateAcademicYearRequest,
) (*academicv1.AcademicYearResponse, error) {
	y, err := h.academicService.CreateAcademicYear(
		ctx,
		req.Code, req.Name, req.StartDate, req.EndDate, req.IsActive,
	)
	if err != nil {
		return nil, mapYearScopeError(err)
	}
	return &academicv1.AcademicYearResponse{Year: toProtoAcademicYear(y)}, nil
}

func (h *AcademicHandler) SetActiveAcademicYear(
	ctx context.Context,
	req *academicv1.SetActiveAcademicYearRequest,
) (*academicv1.AcademicYearResponse, error) {
	y, err := h.academicService.SetActiveAcademicYear(ctx, req.Id)
	if err != nil {
		return nil, mapYearScopeError(err)
	}
	return &academicv1.AcademicYearResponse{Year: toProtoAcademicYear(y)}, nil
}

// ─── User scopes ────────────────────────────────────────────────────────────

func toProtoScopeItem(s *model.UserDepartmentScope) *academicv1.UserScopeItem {
	return &academicv1.UserScopeItem{
		UserId:         s.UserID,
		DepartmentId:   s.DepartmentID,
		DepartmentCode: s.DepartmentCode,
		DepartmentName: s.DepartmentName,
	}
}

func (h *AcademicHandler) GetUserScope(
	ctx context.Context,
	req *academicv1.GetUserScopeRequest,
) (*academicv1.UserScopeResponse, error) {
	scopes, err := h.academicService.GetUserScope(ctx, req.UserId)
	if err != nil {
		return nil, mapYearScopeError(err)
	}
	out := make([]*academicv1.UserScopeItem, 0, len(scopes))
	for _, s := range scopes {
		sCopy := s
		out = append(out, toProtoScopeItem(&sCopy))
	}
	return &academicv1.UserScopeResponse{UserId: req.UserId, Scopes: out}, nil
}

func (h *AcademicHandler) SetUserScope(
	ctx context.Context,
	req *academicv1.SetUserScopeRequest,
) (*academicv1.UserScopeResponse, error) {
	scopes, err := h.academicService.SetUserScope(ctx, req.UserId, req.DepartmentIds)
	if err != nil {
		return nil, mapYearScopeError(err)
	}
	out := make([]*academicv1.UserScopeItem, 0, len(scopes))
	for _, s := range scopes {
		sCopy := s
		out = append(out, toProtoScopeItem(&sCopy))
	}
	return &academicv1.UserScopeResponse{UserId: req.UserId, Scopes: out}, nil
}
