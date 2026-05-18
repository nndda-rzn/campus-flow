package service

import (
	"context"
	"errors"
	"time"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/repository"
)

var (
	ErrLogNotSupervisor = errors.New("you are not the supervisor of this log")
	ErrAttachmentNotFound = errors.New("attachment not found")
)

type GuidanceLogService struct {
	repo *repository.GuidanceLogRepository
}

func NewGuidanceLogService(repo *repository.GuidanceLogRepository) *GuidanceLogService {
	return &GuidanceLogService{repo: repo}
}

func (s *GuidanceLogService) GetLogsByStudent(ctx context.Context, studentUserID string) ([]model.GuidanceLog, error) {
	return s.repo.GetLogsByStudent(ctx, studentUserID)
}

func (s *GuidanceLogService) GetLogsByLecturer(ctx context.Context, lecturerUserID string) ([]model.GuidanceLog, error) {
	return s.repo.GetLogsByLecturer(ctx, lecturerUserID)
}

func (s *GuidanceLogService) GetLogByID(ctx context.Context, id string) (*model.GuidanceLog, error) {
	return s.repo.GetLogByID(ctx, id)
}

func (s *GuidanceLogService) CreateLog(ctx context.Context, log *model.GuidanceLog) (*model.GuidanceLog, error) {
	log.Status = "DRAFT"
	return s.repo.CreateLog(ctx, log)
}

func (s *GuidanceLogService) UpdateLog(ctx context.Context, log *model.GuidanceLog) error {
	return s.repo.UpdateLog(ctx, log)
}

func (s *GuidanceLogService) DeleteLog(ctx context.Context, id string) error {
	return s.repo.DeleteLog(ctx, id)
}

// ─── Enhanced Guidance Log ──────────────────────────────────────────────────

// UpdateLecturerNotes updates the lecturer's notes and milestone tag for a log
func (s *GuidanceLogService) UpdateLecturerNotes(ctx context.Context, logID, lecturerUserID, notes, milestoneID string) (*model.GuidanceLog, error) {
	// Validate lecturer is the supervisor
	log, err := s.repo.GetLogByID(ctx, logID)
	if err != nil {
		return nil, err
	}

	if log.LecturerUserID != lecturerUserID {
		return nil, ErrLogNotSupervisor
	}

	var milestoneIDPtr *string
	if milestoneID != "" {
		milestoneIDPtr = &milestoneID
	}

	if err := s.repo.UpdateLecturerNotes(ctx, logID, notes, milestoneIDPtr); err != nil {
		return nil, err
	}

	return s.repo.GetLogByID(ctx, logID)
}

// AttachFile adds a file attachment to a log
func (s *GuidanceLogService) AttachFile(ctx context.Context, logID, fileID, uploadedBy, filename string) (*model.GuidanceLog, error) {
	log, err := s.repo.GetLogByID(ctx, logID)
	if err != nil {
		return nil, err
	}

	// Validate user can attach: must be supervisor or student of this log
	if log.LecturerUserID != uploadedBy && log.StudentUserID != uploadedBy {
		return nil, ErrLogNotSupervisor
	}

	// Append new attachment
	newAttachment := model.GuidanceLogAttachment{
		FileID:     fileID,
		Filename:   filename,
		UploadedBy: uploadedBy,
		UploadedAt: time.Now(),
	}

	attachments := append(log.Attachments, newAttachment)

	if err := s.repo.UpdateAttachments(ctx, logID, attachments); err != nil {
		return nil, err
	}

	return s.repo.GetLogByID(ctx, logID)
}

// RemoveAttachment removes a file attachment from a log
func (s *GuidanceLogService) RemoveAttachment(ctx context.Context, logID, fileID, actorUserID string) (*model.GuidanceLog, error) {
	log, err := s.repo.GetLogByID(ctx, logID)
	if err != nil {
		return nil, err
	}

	// Validate user can remove: must be uploader or supervisor
	if log.LecturerUserID != actorUserID && log.StudentUserID != actorUserID {
		return nil, ErrLogNotSupervisor
	}

	// Find and remove attachment
	found := false
	newAttachments := make([]model.GuidanceLogAttachment, 0, len(log.Attachments))
	for _, a := range log.Attachments {
		if a.FileID == fileID {
			// Only uploader or supervisor can remove
			if a.UploadedBy != actorUserID && log.LecturerUserID != actorUserID {
				continue
			}
			found = true
			continue
		}
		newAttachments = append(newAttachments, a)
	}

	if !found {
		return nil, ErrAttachmentNotFound
	}

	if err := s.repo.UpdateAttachments(ctx, logID, newAttachments); err != nil {
		return nil, err
	}

	return s.repo.GetLogByID(ctx, logID)
}
