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

func (h *AcademicHandler) ListLecturers(
	ctx context.Context,
	req *academicv1.ListLecturersRequest,
) (*academicv1.ListLecturersResponse, error) {
	lecturers, err := h.academicService.ListLecturers(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	items := make([]*academicv1.LecturerItem, 0, len(lecturers))
	for _, lecturer := range lecturers {
		items = append(
			items, &academicv1.LecturerItem{
				Id:                 lecturer.ID,
				UserId:             lecturer.UserID,
				Nidn:               lecturer.NIDN,
				FullName:           lecturer.FullName,
				Email:              lecturer.Email,
				Status:             lecturer.Status,
				MaxSupervisorQuota: lecturer.MaxSupervisorQuota,
			},
		)
	}

	return &academicv1.ListLecturersResponse{
		Lecturers: items,
	}, nil
}

func (h *AcademicHandler) CreateSupervisorRequest(
	ctx context.Context,
	req *academicv1.CreateSupervisorRequestRequest,
) (*academicv1.SupervisorRequestResponse, error) {
	created, err := h.academicService.CreateSupervisorRequest(
		ctx,
		req.StudentUserId,
		req.TopicTitle,
		req.TopicDescription,
		req.LecturerIds,
	)
	if err != nil {
		return nil, mapSupervisorError(err)
	}

	return &academicv1.SupervisorRequestResponse{
		Request: toProtoSupervisorRequest(created),
	}, nil
}

func (h *AcademicHandler) ListMySupervisorRequests(
	ctx context.Context,
	req *academicv1.ListMySupervisorRequestsRequest,
) (*academicv1.ListSupervisorRequestsResponse, error) {
	requests, err := h.academicService.ListMySupervisorRequests(ctx, req.StudentUserId)
	if err != nil {
		return nil, mapSupervisorError(err)
	}

	return toProtoSupervisorRequestList(requests), nil
}

func (h *AcademicHandler) ListLecturerSupervisorRequests(
	ctx context.Context,
	req *academicv1.ListLecturerSupervisorRequestsRequest,
) (*academicv1.ListSupervisorRequestsResponse, error) {
	requests, err := h.academicService.ListLecturerSupervisorRequests(ctx, req.LecturerUserId)
	if err != nil {
		return nil, mapSupervisorError(err)
	}

	return toProtoSupervisorRequestList(requests), nil
}

func (h *AcademicHandler) VerifySupervisorRequest(
	ctx context.Context,
	req *academicv1.SupervisorWorkflowActionRequest,
) (*academicv1.SupervisorRequestResponse, error) {
	updated, err := h.academicService.VerifySupervisorRequest(ctx, req.RequestId, req.ActorUserId, req.Note)
	if err != nil {
		return nil, mapSupervisorError(err)
	}

	return &academicv1.SupervisorRequestResponse{Request: toProtoSupervisorRequest(updated)}, nil
}

func (h *AcademicHandler) AssignSupervisor(
	ctx context.Context,
	req *academicv1.AssignSupervisorRequest,
) (*academicv1.SupervisorRequestResponse, error) {
	updated, err := h.academicService.AssignSupervisor(ctx, req.RequestId, req.ActorUserId, req.LecturerId, req.Note)
	if err != nil {
		return nil, mapSupervisorError(err)
	}

	return &academicv1.SupervisorRequestResponse{Request: toProtoSupervisorRequest(updated)}, nil
}

func (h *AcademicHandler) AcceptSupervisorRequest(
	ctx context.Context,
	req *academicv1.SupervisorWorkflowActionRequest,
) (*academicv1.SupervisorRequestResponse, error) {
	updated, err := h.academicService.AcceptSupervisorRequest(ctx, req.RequestId, req.ActorUserId, req.Note)
	if err != nil {
		return nil, mapSupervisorError(err)
	}

	return &academicv1.SupervisorRequestResponse{Request: toProtoSupervisorRequest(updated)}, nil
}

func (h *AcademicHandler) RejectSupervisorRequest(
	ctx context.Context,
	req *academicv1.SupervisorWorkflowActionRequest,
) (*academicv1.SupervisorRequestResponse, error) {
	updated, err := h.academicService.RejectSupervisorRequest(ctx, req.RequestId, req.ActorUserId, req.Note)
	if err != nil {
		return nil, mapSupervisorError(err)
	}

	return &academicv1.SupervisorRequestResponse{Request: toProtoSupervisorRequest(updated)}, nil
}

func mapSupervisorError(err error) error {
	if errors.Is(err, service.ErrInvalidInput) {
		return status.Error(codes.InvalidArgument, "invalid supervisor request input")
	}

	if errors.Is(err, service.ErrAcademicRequestNotFound) {
		return status.Error(codes.NotFound, "supervisor request not found")
	}

	if errors.Is(err, service.ErrInvalidStatusTransition) {
		return status.Error(codes.FailedPrecondition, "invalid supervisor status transition")
	}

	return status.Error(codes.Internal, err.Error())
}

func toProtoSupervisorRequest(req *model.SupervisorRequest) *academicv1.SupervisorRequest {
	choices := make([]*academicv1.SupervisorChoice, 0, len(req.Choices))
	for _, choice := range req.Choices {
		choices = append(
			choices, &academicv1.SupervisorChoice{
				LecturerId:   choice.LecturerID,
				LecturerName: choice.LecturerName,
				Priority:     choice.Priority,
			},
		)
	}

	return &academicv1.SupervisorRequest{
		Id:                   req.ID,
		RequestNumber:        req.RequestNumber,
		StudentUserId:        req.StudentUserID,
		TopicTitle:           req.TopicTitle,
		TopicDescription:     req.TopicDescription,
		Status:               req.Status,
		AssignedLecturerId:   req.AssignedLecturerID,
		AssignedLecturerName: req.AssignedLecturerName,
		Choices:              choices,
		CreatedAt:            req.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:            req.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}

func toProtoSupervisorRequestList(requests []model.SupervisorRequest) *academicv1.ListSupervisorRequestsResponse {
	items := make([]*academicv1.SupervisorRequest, 0, len(requests))

	for _, request := range requests {
		requestCopy := request
		items = append(items, toProtoSupervisorRequest(&requestCopy))
	}

	return &academicv1.ListSupervisorRequestsResponse{
		Requests: items,
	}
}
