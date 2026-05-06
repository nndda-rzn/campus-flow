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

type AcademicHandler struct {
	academicv1.UnimplementedAcademicServiceServer
	academicService *service.AcademicService
}

func NewAcademicHandler(academicService *service.AcademicService) *AcademicHandler {
	return &AcademicHandler{
		academicService: academicService,
	}
}

func (h *AcademicHandler) ListAcademicServices(
	ctx context.Context,
	req *academicv1.ListAcademicServicesRequest,
) (*academicv1.ListAcademicServicesResponse, error) {
	services, err := h.academicService.ListAcademicServices(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	items := make([]*academicv1.AcademicServiceItem, 0, len(services))
	for _, svc := range services {
		items = append(items, &academicv1.AcademicServiceItem{
			Id:          svc.ID,
			Code:        svc.Code,
			Name:        svc.Name,
			Description: svc.Description,
			IsActive:    svc.IsActive,
		})
	}

	return &academicv1.ListAcademicServicesResponse{
		Services: items,
	}, nil
}

func (h *AcademicHandler) CreateAcademicRequest(
	ctx context.Context,
	req *academicv1.CreateAcademicRequestRequest,
) (*academicv1.AcademicRequestResponse, error) {
	created, err := h.academicService.CreateAcademicRequest(
		ctx,
		req.StudentUserId,
		req.ServiceCode,
		req.Title,
		req.Description,
	)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return nil, status.Error(codes.InvalidArgument, "student_user_id, service_code, and title are required")
		}

		if errors.Is(err, service.ErrAcademicServiceNotFound) {
			return nil, status.Error(codes.NotFound, "academic service not found")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &academicv1.AcademicRequestResponse{
		Request: toProtoAcademicRequest(created),
	}, nil
}

func (h *AcademicHandler) GetAcademicRequest(
	ctx context.Context,
	req *academicv1.GetAcademicRequestRequest,
) (*academicv1.AcademicRequestResponse, error) {
	found, err := h.academicService.GetAcademicRequest(ctx, req.RequestId)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return nil, status.Error(codes.InvalidArgument, "request_id is required")
		}

		if errors.Is(err, service.ErrAcademicRequestNotFound) {
			return nil, status.Error(codes.NotFound, "academic request not found")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &academicv1.AcademicRequestResponse{
		Request: toProtoAcademicRequest(found),
	}, nil
}

func (h *AcademicHandler) ListMyAcademicRequests(
	ctx context.Context,
	req *academicv1.ListMyAcademicRequestsRequest,
) (*academicv1.ListAcademicRequestsResponse, error) {
	requests, err := h.academicService.ListMyAcademicRequests(ctx, req.StudentUserId)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return nil, status.Error(codes.InvalidArgument, "student_user_id is required")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	items := make([]*academicv1.AcademicRequest, 0, len(requests))
	for _, item := range requests {
		itemCopy := item
		items = append(items, toProtoAcademicRequest(&itemCopy))
	}

	return &academicv1.ListAcademicRequestsResponse{
		Requests: items,
	}, nil
}

func toProtoAcademicRequest(req *model.AcademicRequest) *academicv1.AcademicRequest {
	return &academicv1.AcademicRequest{
		Id:                req.ID,
		RequestNumber:     req.RequestNumber,
		StudentUserId:     req.StudentUserID,
		AcademicServiceId: req.AcademicServiceID,
		ServiceCode:       req.ServiceCode,
		ServiceName:       req.ServiceName,
		Title:             req.Title,
		Description:       req.Description,
		Status:            req.Status,
		CreatedAt:         req.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:         req.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}