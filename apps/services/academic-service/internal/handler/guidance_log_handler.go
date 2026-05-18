package handler

import (
	"context"
	"time"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/service"
	academicv1 "campus-flow/proto/gen/academic/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type GuidanceLogHandler struct {
	svc *service.GuidanceLogService
}

func NewGuidanceLogHandler(svc *service.GuidanceLogService) *GuidanceLogHandler {
	return &GuidanceLogHandler{svc: svc}
}

func (h *GuidanceLogHandler) GetLogsByStudent(ctx context.Context, req *academicv1.GetLogsByStudentRequest) (*academicv1.GetLogsResponse, error) {
	logs, err := h.svc.GetLogsByStudent(ctx, req.StudentUserId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get logs: %v", err)
	}
	return h.mapLogs(logs), nil
}

func (h *GuidanceLogHandler) GetLogsByLecturer(ctx context.Context, req *academicv1.GetLogsByLecturerRequest) (*academicv1.GetLogsResponse, error) {
	logs, err := h.svc.GetLogsByLecturer(ctx, req.LecturerUserId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get logs: %v", err)
	}
	return h.mapLogs(logs), nil
}

func (h *GuidanceLogHandler) GetLogByID(ctx context.Context, req *academicv1.GetLogByIDRequest) (*academicv1.GuidanceLogResponse, error) {
	log, err := h.svc.GetLogByID(ctx, req.Id)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get log: %v", err)
	}
	return &academicv1.GuidanceLogResponse{Log: h.mapLog(log)}, nil
}

func (h *GuidanceLogHandler) CreateLog(ctx context.Context, req *academicv1.CreateLogRequest) (*academicv1.GuidanceLogResponse, error) {
	sessionDate, err := time.Parse(time.DateOnly, req.SessionDate)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid session_date format (YYYY-MM-DD expected): %v", err)
	}

	var startTime, endTime *time.Time
	if req.StartTime != "" {
		t, err := time.Parse("15:04:05", req.StartTime)
		if err == nil {
			startTime = &t
		}
	}
	if req.EndTime != "" {
		t, err := time.Parse("15:04:05", req.EndTime)
		if err == nil {
			endTime = &t
		}
	}

	log := &model.GuidanceLog{
		StudentUserID:       req.StudentUserId,
		SupervisorRequestID: req.SupervisorRequestId,
		LecturerUserID:      req.LecturerUserId,
		SessionDate:         sessionDate,
		StartTime:           startTime,
		EndTime:             endTime,
		Topic:               req.Topic,
		DiscussionSummary:   req.DiscussionSummary,
		NextAction:          req.NextAction,
	}

	createdLog, err := h.svc.CreateLog(ctx, log)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create log: %v", err)
	}
	
	// Fetch the full log to get the derived names
	fullLog, err := h.svc.GetLogByID(ctx, createdLog.ID)
	if err != nil {
		return &academicv1.GuidanceLogResponse{Log: h.mapLog(createdLog)}, nil
	}

	return &academicv1.GuidanceLogResponse{Log: h.mapLog(fullLog)}, nil
}

func (h *GuidanceLogHandler) UpdateLog(ctx context.Context, req *academicv1.UpdateLogRequest) (*academicv1.GuidanceLogResponse, error) {
	log, err := h.svc.GetLogByID(ctx, req.Id)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get log for update: %v", err)
	}

	if req.SessionDate != "" {
		sessionDate, err := time.Parse(time.DateOnly, req.SessionDate)
		if err == nil {
			log.SessionDate = sessionDate
		}
	}

	if req.StartTime != "" {
		t, err := time.Parse("15:04:05", req.StartTime)
		if err == nil {
			log.StartTime = &t
		}
	} else {
		log.StartTime = nil
	}
	
	if req.EndTime != "" {
		t, err := time.Parse("15:04:05", req.EndTime)
		if err == nil {
			log.EndTime = &t
		}
	} else {
		log.EndTime = nil
	}

	if req.Topic != "" {
		log.Topic = req.Topic
	}
	if req.DiscussionSummary != "" {
		log.DiscussionSummary = req.DiscussionSummary
	}
	log.NextAction = req.NextAction
	
	if req.Status != "" {
		log.Status = req.Status
		if req.Status == "SUBMITTED" && log.SubmittedAt == nil {
			now := time.Now()
			log.SubmittedAt = &now
		} else if req.Status == "APPROVED" && log.ApprovedAt == nil {
			now := time.Now()
			log.ApprovedAt = &now
		} else if req.Status == "DRAFT" {
			log.SubmittedAt = nil
		}
	}
	
	if req.SupervisorFeedback != "" {
		log.SupervisorFeedback = req.SupervisorFeedback
	}

	err = h.svc.UpdateLog(ctx, log)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update log: %v", err)
	}

	return &academicv1.GuidanceLogResponse{Log: h.mapLog(log)}, nil
}

func (h *GuidanceLogHandler) DeleteLog(ctx context.Context, req *academicv1.DeleteLogRequest) (*academicv1.DeleteLogResponse, error) {
	err := h.svc.DeleteLog(ctx, req.Id)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete log: %v", err)
	}
	return &academicv1.DeleteLogResponse{Success: true}, nil
}

func (h *GuidanceLogHandler) mapLogs(logs []model.GuidanceLog) *academicv1.GetLogsResponse {
	res := &academicv1.GetLogsResponse{}
	for _, l := range logs {
		res.Logs = append(res.Logs, h.mapLog(&l))
	}
	return res
}

func (h *GuidanceLogHandler) mapLog(l *model.GuidanceLog) *academicv1.GuidanceLogItem {
	item := &academicv1.GuidanceLogItem{
		Id:                  l.ID,
		StudentUserId:       l.StudentUserID,
		SupervisorRequestId: l.SupervisorRequestID,
		LecturerUserId:      l.LecturerUserID,
		SessionDate:         l.SessionDate.Format(time.DateOnly),
		Topic:               l.Topic,
		DiscussionSummary:   l.DiscussionSummary,
		NextAction:          l.NextAction,
		Status:              l.Status,
		SupervisorFeedback:  l.SupervisorFeedback,
		StudentName:         l.StudentName,
		LecturerName:        l.LecturerName,
		CreatedAt:           l.CreatedAt.Format(time.RFC3339),
		UpdatedAt:           l.UpdatedAt.Format(time.RFC3339),
		LecturerNotes:       l.LecturerNotes,
		MilestoneName:       l.MilestoneName,
		MilestoneCode:       l.MilestoneCode,
	}

	if l.MilestoneID != nil {
		item.MilestoneId = *l.MilestoneID
	}

	if l.StartTime != nil {
		item.StartTime = l.StartTime.Format("15:04:05")
	}
	if l.EndTime != nil {
		item.EndTime = l.EndTime.Format("15:04:05")
	}
	if l.SubmittedAt != nil {
		item.SubmittedAt = l.SubmittedAt.Format(time.RFC3339)
	}
	if l.ApprovedAt != nil {
		item.ApprovedAt = l.ApprovedAt.Format(time.RFC3339)
	}

	for _, a := range l.Attachments {
		item.Attachments = append(item.Attachments, &academicv1.GuidanceLogAttachment{
			FileId:         a.FileID,
			Filename:       a.Filename,
			UploadedBy:     a.UploadedBy,
			UploadedByName: a.UploadedByName,
			UploadedAt:     a.UploadedAt.Format(time.RFC3339),
		})
	}

	return item
}

// ─── Enhanced Guidance Log ──────────────────────────────────────────────────

func (h *GuidanceLogHandler) UpdateLogNotes(ctx context.Context, req *academicv1.UpdateGuidanceLogNotesRequest) (*academicv1.GuidanceLogResponse, error) {
	log, err := h.svc.UpdateLecturerNotes(ctx, req.LogId, req.LecturerUserId, req.LecturerNotes, req.MilestoneId)
	if err != nil {
		if err == service.ErrLogNotSupervisor {
			return nil, status.Errorf(codes.PermissionDenied, "you are not the supervisor of this log")
		}
		return nil, status.Errorf(codes.Internal, "failed to update log notes: %v", err)
	}

	return &academicv1.GuidanceLogResponse{Log: h.mapLog(log)}, nil
}

func (h *GuidanceLogHandler) AttachFileToLog(ctx context.Context, req *academicv1.AttachFileToLogRequest) (*academicv1.GuidanceLogResponse, error) {
	log, err := h.svc.AttachFile(ctx, req.LogId, req.FileId, req.UploadedBy, req.Filename)
	if err != nil {
		if err == service.ErrLogNotSupervisor {
			return nil, status.Errorf(codes.PermissionDenied, "you are not authorized to attach files to this log")
		}
		return nil, status.Errorf(codes.Internal, "failed to attach file: %v", err)
	}

	return &academicv1.GuidanceLogResponse{Log: h.mapLog(log)}, nil
}

func (h *GuidanceLogHandler) RemoveAttachment(ctx context.Context, req *academicv1.RemoveAttachmentRequest) (*academicv1.GuidanceLogResponse, error) {
	log, err := h.svc.RemoveAttachment(ctx, req.LogId, req.FileId, req.ActorUserId)
	if err != nil {
		if err == service.ErrLogNotSupervisor {
			return nil, status.Errorf(codes.PermissionDenied, "you are not authorized to remove this attachment")
		}
		if err == service.ErrAttachmentNotFound {
			return nil, status.Errorf(codes.NotFound, "attachment not found")
		}
		return nil, status.Errorf(codes.Internal, "failed to remove attachment: %v", err)
	}

	return &academicv1.GuidanceLogResponse{Log: h.mapLog(log)}, nil
}
