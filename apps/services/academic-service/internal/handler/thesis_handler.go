package handler

import (
	"context"
	"time"

	"campus-flow/apps/services/academic-service/internal/service"
	academicv1 "campus-flow/proto/gen/academic/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ThesisHandler struct {
	svc *service.ThesisService
}

func NewThesisHandler(svc *service.ThesisService) *ThesisHandler {
	return &ThesisHandler{svc: svc}
}

func (h *ThesisHandler) GetMilestonesByDepartment(ctx context.Context, req *academicv1.GetMilestonesByDepartmentRequest) (*academicv1.GetMilestonesByDepartmentResponse, error) {
	milestones, err := h.svc.GetMilestonesByDepartment(ctx, req.DepartmentId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get milestones: %v", err)
	}

	res := &academicv1.GetMilestonesByDepartmentResponse{}
	for _, m := range milestones {
		res.Milestones = append(res.Milestones, &academicv1.ThesisMilestoneItem{
			Id:            m.ID,
			DepartmentId:  m.DepartmentID,
			Code:          m.Code,
			Name:          m.Name,
			Description:   m.Description,
			SequenceOrder: int32(m.SequenceOrder),
			IsActive:      m.IsActive,
			CreatedAt:     m.CreatedAt.Format(time.RFC3339),
			UpdatedAt:     m.UpdatedAt.Format(time.RFC3339),
		})
	}
	return res, nil
}

func (h *ThesisHandler) GetProgressByStudent(ctx context.Context, req *academicv1.GetProgressByStudentRequest) (*academicv1.GetProgressByStudentResponse, error) {
	progress, err := h.svc.GetProgressByStudent(ctx, req.StudentUserId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get progress: %v", err)
	}

	res := &academicv1.GetProgressByStudentResponse{}
	for _, p := range progress {
		item := &academicv1.ThesisProgressItem{
			Id:                  p.ID,
			StudentUserId:       p.StudentUserID,
			SupervisorRequestId: p.SupervisorRequestID,
			MilestoneId:         p.MilestoneID,
			Status:              p.Status,
			Notes:               p.Notes,
			MilestoneName:       p.MilestoneName,
			MilestoneCode:       p.MilestoneCode,
			SequenceOrder:       int32(p.SequenceOrder),
			CreatedAt:           p.CreatedAt.Format(time.RFC3339),
			UpdatedAt:           p.UpdatedAt.Format(time.RFC3339),
		}

		if p.TargetDate != nil {
			item.TargetDate = p.TargetDate.Format(time.DateOnly)
		}
		if p.CompletedAt != nil {
			item.CompletedAt = p.CompletedAt.Format(time.RFC3339)
		}
		res.Progress = append(res.Progress, item)
	}
	return res, nil
}

func (h *ThesisHandler) UpdateProgress(ctx context.Context, req *academicv1.UpdateProgressRequest) (*academicv1.ThesisProgressResponse, error) {
	p, err := h.svc.UpdateProgress(ctx, req.Id, req.Notes, req.TargetDate, req.Status)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update progress: %v", err)
	}

	item := &academicv1.ThesisProgressItem{
		Id:                  p.ID,
		StudentUserId:       p.StudentUserID,
		SupervisorRequestId: p.SupervisorRequestID,
		MilestoneId:         p.MilestoneID,
		Status:              p.Status,
		Notes:               p.Notes,
		CreatedAt:           p.CreatedAt.Format(time.RFC3339),
		UpdatedAt:           p.UpdatedAt.Format(time.RFC3339),
	}

	if p.TargetDate != nil {
		item.TargetDate = p.TargetDate.Format(time.DateOnly)
	}
	if p.CompletedAt != nil {
		item.CompletedAt = p.CompletedAt.Format(time.RFC3339)
	}

	return &academicv1.ThesisProgressResponse{Progress: item}, nil
}
