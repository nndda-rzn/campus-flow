package handler

import (
	"context"

	"campus-flow/apps/services/academic-service/internal/service"
	academicv1 "campus-flow/proto/gen/academic/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ThesisOverviewHandler struct {
	svc *service.ThesisService
}

func NewThesisOverviewHandler(svc *service.ThesisService) *ThesisOverviewHandler {
	return &ThesisOverviewHandler{svc: svc}
}

func (h *ThesisOverviewHandler) ListDepartmentThesisOverview(ctx context.Context, req *academicv1.ListDepartmentThesisOverviewRequest) (*academicv1.ListDepartmentThesisOverviewResponse, error) {
	summary, err := h.svc.ListDepartmentThesisOverview(ctx, req.DepartmentId, req.StuckOnly, req.Search)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list thesis overview: %v", err)
	}

	res := &academicv1.ListDepartmentThesisOverviewResponse{
		Total:      summary.Total,
		OnTrack:    summary.OnTrack,
		Behind:     summary.Behind,
		NotStarted: summary.NotStarted,
	}

	for _, item := range summary.Items {
		res.Students = append(res.Students, &academicv1.ThesisOverviewItem{
			StudentUserId:         item.StudentUserID,
			StudentName:           item.StudentName,
			Nim:                   item.NIM,
			TopicTitle:            item.TopicTitle,
			LecturerName:          item.LecturerName,
			CurrentMilestone:      item.CurrentMilestone,
			CompletionPercentage:  item.CompletionPercentage,
			DaysSinceLastActivity: item.DaysSinceLastActivity,
			IsStuck:               item.IsStuck,
			SupervisorRequestId:   item.SupervisorRequestID,
		})
	}

	return res, nil
}
