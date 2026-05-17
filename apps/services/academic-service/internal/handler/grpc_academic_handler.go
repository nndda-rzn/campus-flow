package handler

import (
	"context"
	"errors"
	"log"

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
	log.Printf("[CreateAcademicRequest] student_user_id=%q service_code=%q title=%q",
		req.StudentUserId, req.ServiceCode, req.Title)

	created, err := h.academicService.CreateAcademicRequest(
		ctx,
		req.StudentUserId,
		req.ServiceCode,
		req.Title,
		req.Description,
	)
	if err != nil {
		log.Printf("[CreateAcademicRequest] ERROR: %v", err)

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

func (h *AcademicHandler) ListAllAcademicRequests(
	ctx context.Context,
	req *academicv1.ListAllAcademicRequestsRequest,
) (*academicv1.ListAcademicRequestsResponse, error) {
	requests, err := h.academicService.ListAllAcademicRequests(ctx, req.StatusFilter)
	if err != nil {
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

func (h *AcademicHandler) VerifyAcademicRequest(
	ctx context.Context,
	req *academicv1.WorkflowActionRequest,
) (*academicv1.AcademicRequestResponse, error) {
	updated, err := h.academicService.VerifyAcademicRequest(
		ctx,
		req.RequestId,
		req.ActorUserId,
		req.Note,
	)
	if err != nil {
		return nil, mapWorkflowError(err)
	}

	return &academicv1.AcademicRequestResponse{
		Request: toProtoAcademicRequest(updated),
	}, nil
}

func (h *AcademicHandler) ApproveAcademicRequest(
	ctx context.Context,
	req *academicv1.WorkflowActionRequest,
) (*academicv1.AcademicRequestResponse, error) {
	updated, err := h.academicService.ApproveAcademicRequest(
		ctx,
		req.RequestId,
		req.ActorUserId,
		req.Note,
	)
	if err != nil {
		return nil, mapWorkflowError(err)
	}

	return &academicv1.AcademicRequestResponse{
		Request: toProtoAcademicRequest(updated),
	}, nil
}

func (h *AcademicHandler) RejectAcademicRequest(
	ctx context.Context,
	req *academicv1.WorkflowActionRequest,
) (*academicv1.AcademicRequestResponse, error) {
	updated, err := h.academicService.RejectAcademicRequest(
		ctx,
		req.RequestId,
		req.ActorUserId,
		req.Note,
	)
	if err != nil {
		return nil, mapWorkflowError(err)
	}

	return &academicv1.AcademicRequestResponse{
		Request: toProtoAcademicRequest(updated),
	}, nil
}

func (h *AcademicHandler) CompleteAcademicRequest(
	ctx context.Context,
	req *academicv1.WorkflowActionRequest,
) (*academicv1.AcademicRequestResponse, error) {
	updated, err := h.academicService.CompleteAcademicRequest(
		ctx,
		req.RequestId,
		req.ActorUserId,
		req.Note,
	)
	if err != nil {
		return nil, mapWorkflowError(err)
	}

	return &academicv1.AcademicRequestResponse{
		Request: toProtoAcademicRequest(updated),
	}, nil
}

func (h *AcademicHandler) CancelAcademicRequest(
	ctx context.Context,
	req *academicv1.WorkflowActionRequest,
) (*academicv1.AcademicRequestResponse, error) {
	updated, err := h.academicService.CancelAcademicRequest(
		ctx,
		req.RequestId,
		req.ActorUserId,
		req.Note,
	)
	if err != nil {
		return nil, mapWorkflowError(err)
	}

	return &academicv1.AcademicRequestResponse{
		Request: toProtoAcademicRequest(updated),
	}, nil
}

func (h *AcademicHandler) RequestRevisionAcademicRequest(
	ctx context.Context,
	req *academicv1.WorkflowActionRequest,
) (*academicv1.AcademicRequestResponse, error) {
	updated, err := h.academicService.RequestRevisionAcademicRequest(
		ctx,
		req.RequestId,
		req.ActorUserId,
		req.Note,
	)
	if err != nil {
		return nil, mapWorkflowError(err)
	}

	return &academicv1.AcademicRequestResponse{
		Request: toProtoAcademicRequest(updated),
	}, nil
}

func (h *AcademicHandler) SubmitAcademicRequest(
	ctx context.Context,
	req *academicv1.WorkflowActionRequest,
) (*academicv1.AcademicRequestResponse, error) {
	updated, err := h.academicService.SubmitAcademicRequest(
		ctx,
		req.RequestId,
		req.ActorUserId,
		req.Note,
	)
	if err != nil {
		return nil, mapWorkflowError(err)
	}

	return &academicv1.AcademicRequestResponse{
		Request: toProtoAcademicRequest(updated),
	}, nil
}

func (h *AcademicHandler) UpdateAcademicRequest(
	ctx context.Context,
	req *academicv1.UpdateAcademicRequestRequest,
) (*academicv1.AcademicRequestResponse, error) {
	updated, err := h.academicService.UpdateAcademicRequest(
		ctx,
		req.RequestId,
		req.ActorUserId,
		req.Title,
		req.Description,
	)
	if err != nil {
		return nil, mapWorkflowError(err)
	}

	return &academicv1.AcademicRequestResponse{
		Request: toProtoAcademicRequest(updated),
	}, nil
}

func mapWorkflowError(err error) error {
	if errors.Is(err, service.ErrInvalidInput) {
		return status.Error(codes.InvalidArgument, "request_id and actor_user_id are required")
	}

	if errors.Is(err, service.ErrNoteRequired) {
		return status.Error(codes.InvalidArgument, "revision note is required")
	}

	if errors.Is(err, service.ErrNoteTooLong) {
		return status.Error(codes.InvalidArgument, "note exceeds maximum length of 2000 characters")
	}

	if errors.Is(err, service.ErrAcademicRequestNotFound) {
		return status.Error(codes.NotFound, "academic request not found")
	}

	if errors.Is(err, service.ErrInvalidStatusTransition) {
		return status.Error(codes.FailedPrecondition, "invalid status transition")
	}

	if errors.Is(err, service.ErrForbidden) {
		return status.Error(codes.PermissionDenied, "forbidden: insufficient permissions")
	}

	if errors.Is(err, service.ErrQuotaExceeded) {
		return status.Error(codes.FailedPrecondition, "lecturer supervisor quota exceeded")
	}

	return status.Error(codes.Internal, err.Error())
}

func (h *AcademicHandler) GetAcademicRequestHistory(
	ctx context.Context,
	req *academicv1.GetAcademicRequestHistoryRequest,
) (*academicv1.GetAcademicRequestHistoryResponse, error) {
	histories, err := h.academicService.GetAcademicRequestHistory(ctx, req.RequestId)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return nil, status.Error(codes.InvalidArgument, "request_id is required")
		}
		if errors.Is(err, service.ErrAcademicRequestNotFound) {
			return nil, status.Error(codes.NotFound, "academic request not found")
		}
		return nil, status.Error(codes.Internal, err.Error())
	}

	items := make([]*academicv1.RequestStatusHistoryItem, 0, len(histories))
	for _, h := range histories {
		items = append(items, &academicv1.RequestStatusHistoryItem{
			Id:          h.ID,
			RequestId:   h.RequestID,
			OldStatus:   h.OldStatus,
			NewStatus:   h.NewStatus,
			ActorUserId: h.ActorUserID,
			Note:        h.Note,
			CreatedAt:   h.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	return &academicv1.GetAcademicRequestHistoryResponse{
		Histories: items,
	}, nil
}
