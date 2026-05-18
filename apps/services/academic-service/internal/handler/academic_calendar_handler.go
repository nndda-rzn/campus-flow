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
func (h *AcademicCalendarHandler) CreateEvent(ctx context.Context, req *academicv1.CreateEventRequest) (*academicv1.AcademicCalendarResponse, error) {
	startDate, err := time.Parse(time.DateOnly, req.StartDate)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid start_date format (YYYY-MM-DD expected): %v", err)
	}
	
	var endDate time.Time
	if req.EndDate != "" {
		endDate, err = time.Parse(time.DateOnly, req.EndDate)
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "invalid end_date format (YYYY-MM-DD expected): %v", err)
		}
	}

	var deptID *string
	if req.DepartmentId != "" {
		deptID = &req.DepartmentId
	}

	event := &model.AcademicCalendar{
		AcademicYearID:  req.AcademicYearId,
		DepartmentID:    deptID,
		Title:           req.Title,
		Description:     req.Description,
		EventType:       req.EventType,
		StartDate:       startDate,
		EndDate:         endDate,
		IsAllDay:        req.IsAllDay,
		TargetRoles:     req.TargetRoles,
		IsActive:        true,
		CreatedByUserID: req.CreatedByUserId,
	}

	createdEvent, err := h.svc.CreateEvent(ctx, event)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create event: %v", err)
	}

	return h.mapEventToResponse(createdEvent), nil
}

func (h *AcademicCalendarHandler) UpdateEvent(ctx context.Context, req *academicv1.UpdateEventRequest) (*academicv1.AcademicCalendarResponse, error) {
	startDate, err := time.Parse(time.DateOnly, req.StartDate)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid start_date format (YYYY-MM-DD expected): %v", err)
	}
	
	var endDate time.Time
	if req.EndDate != "" {
		endDate, err = time.Parse(time.DateOnly, req.EndDate)
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "invalid end_date format (YYYY-MM-DD expected): %v", err)
		}
	}

	event := &model.AcademicCalendar{
		ID:          req.Id,
		Title:       req.Title,
		Description: req.Description,
		EventType:   req.EventType,
		StartDate:   startDate,
		EndDate:     endDate,
		IsAllDay:    req.IsAllDay,
		TargetRoles: req.TargetRoles,
		IsActive:    req.IsActive,
	}

	err = h.svc.UpdateEvent(ctx, event)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update event: %v", err)
	}

	return h.mapEventToResponse(event), nil
}

func (h *AcademicCalendarHandler) DeleteEvent(ctx context.Context, req *academicv1.DeleteEventRequest) (*academicv1.DeleteEventResponse, error) {
	err := h.svc.DeleteEvent(ctx, req.Id)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete event: %v", err)
	}

	return &academicv1.DeleteEventResponse{Success: true}, nil
}

func (h *AcademicCalendarHandler) mapEventToResponse(e *model.AcademicCalendar) *academicv1.AcademicCalendarResponse {
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
	
	return &academicv1.AcademicCalendarResponse{Event: item}
}
