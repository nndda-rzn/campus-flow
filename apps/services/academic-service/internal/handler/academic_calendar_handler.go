package handler

import (
	"context"
	"time"

	"campus-flow/apps/services/academic-service/internal/service"
	academicv1 "campus-flow/proto/gen/academic/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AcademicCalendarHandler struct {
	svc *service.AcademicCalendarService
}

func NewAcademicCalendarHandler(svc *service.AcademicCalendarService) *AcademicCalendarHandler {
	return &AcademicCalendarHandler{svc: svc}
}

func (h *AcademicCalendarHandler) GetEvents(ctx context.Context, req *academicv1.GetEventsRequest) (*academicv1.GetEventsResponse, error) {
	var start, end *time.Time
	
	if req.StartDate != "" {
		t, err := time.Parse(time.DateOnly, req.StartDate)
		if err == nil {
			start = &t
		}
	}
	if req.EndDate != "" {
		t, err := time.Parse(time.DateOnly, req.EndDate)
		if err == nil {
			end = &t
		}
	}

	events, err := h.svc.GetEvents(ctx, start, end, req.DepartmentId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get events: %v", err)
	}

	res := &academicv1.GetEventsResponse{}
	for _, e := range events {
		item := &academicv1.AcademicCalendarItem{
			Id:              e.ID,
			AcademicYearId:  e.AcademicYearID,
			Title:           e.Title,
			Description:     e.Description,
			EventType:       e.EventType,
			StartDate:       e.StartDate.Format(time.DateOnly),
			IsAllDay:        e.IsAllDay,
			TargetRoles:     e.TargetRoles,
			IsActive:        e.IsActive,
			CreatedByUserId: e.CreatedByUserID,
			CreatedAt:       e.CreatedAt.Format(time.RFC3339),
			UpdatedAt:       e.UpdatedAt.Format(time.RFC3339),
		}
		
		if e.DepartmentID != nil {
			item.DepartmentId = *e.DepartmentID
		}
		
		if !e.EndDate.IsZero() {
			item.EndDate = e.EndDate.Format(time.DateOnly)
		}
		
		res.Events = append(res.Events, item)
	}
	return res, nil
}
