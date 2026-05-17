package service

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/file-service/internal/model"
	"campus-flow/apps/services/file-service/internal/repository"
)

var (
	ErrInvalidInput  = errors.New("invalid input")
	ErrFileNotFound  = errors.New("file not found")
	ErrMimeRejected  = errors.New("mime type not allowed")
	ErrSizeRejected  = errors.New("file size exceeds limit")
	ErrEmptyMime     = errors.New("mime type is required")
	ErrEmptyFileSize = errors.New("file size must be greater than zero")
)

// ValidationConfig holds the validation rules used by FileService. It is
// populated from config.Config at construction time.
type ValidationConfig struct {
	MaxSizeBytes    int64
	AllowedMimeType map[string]bool
}

type FileService struct {
	repo       *repository.FileRepository
	validation ValidationConfig
}

func NewFileService(
	repo *repository.FileRepository,
	validation ValidationConfig,
) *FileService {
	return &FileService{
		repo:       repo,
		validation: validation,
	}
}

func (s *FileService) RegisterUploadedFile(
	ctx context.Context,
	file model.File,
) (*model.File, error) {
	file.OriginalName = strings.TrimSpace(file.OriginalName)
	file.StoredName = strings.TrimSpace(file.StoredName)
	file.StoragePath = strings.TrimSpace(file.StoragePath)
	file.MimeType = strings.ToLower(strings.TrimSpace(file.MimeType))
	file.UploadedByUserID = strings.TrimSpace(file.UploadedByUserID)
	file.OwnerType = strings.ToUpper(strings.TrimSpace(file.OwnerType))
	file.OwnerID = strings.TrimSpace(file.OwnerID)
	file.Purpose = strings.ToUpper(strings.TrimSpace(file.Purpose))

	if file.OriginalName == "" ||
		file.StoredName == "" ||
		file.StoragePath == "" ||
		file.UploadedByUserID == "" ||
		file.OwnerType == "" ||
		file.OwnerID == "" ||
		file.Purpose == "" {
		return nil, ErrInvalidInput
	}

	if file.MimeType == "" {
		return nil, ErrEmptyMime
	}
	if file.SizeBytes <= 0 {
		return nil, ErrEmptyFileSize
	}

	if err := s.validate(file); err != nil {
		return nil, err
	}

	return s.repo.RegisterUploadedFile(ctx, file)
}

// validate enforces mime + size policy. Returns ErrMimeRejected /
// ErrSizeRejected for clear translation to gRPC status codes upstream.
func (s *FileService) validate(file model.File) error {
	if s.validation.MaxSizeBytes > 0 && file.SizeBytes > s.validation.MaxSizeBytes {
		return ErrSizeRejected
	}
	if len(s.validation.AllowedMimeType) > 0 &&
		!s.validation.AllowedMimeType[file.MimeType] {
		return ErrMimeRejected
	}
	return nil
}

// MaxSizeBytes exposes the configured size cap so callers (e.g. gateway)
// can echo it back in error messages.
func (s *FileService) MaxSizeBytes() int64 {
	return s.validation.MaxSizeBytes
}

// AllowedMimeTypes returns a sorted list of allowed mime types.
func (s *FileService) AllowedMimeTypes() []string {
	out := make([]string, 0, len(s.validation.AllowedMimeType))
	for k := range s.validation.AllowedMimeType {
		out = append(out, k)
	}
	return out
}

func (s *FileService) GetFileMetadata(ctx context.Context, fileID string) (*model.File, error) {
	fileID = strings.TrimSpace(fileID)
	if fileID == "" {
		return nil, ErrInvalidInput
	}

	file, err := s.repo.GetFileByID(ctx, fileID)
	if err != nil {
		if errors.Is(err, repository.ErrFileNotFound) {
			return nil, ErrFileNotFound
		}

		return nil, err
	}

	return file, nil
}

func (s *FileService) ListFilesByOwner(
	ctx context.Context,
	ownerType string,
	ownerID string,
) ([]model.File, error) {
	ownerType = strings.ToUpper(strings.TrimSpace(ownerType))
	ownerID = strings.TrimSpace(ownerID)

	if ownerType == "" || ownerID == "" {
		return nil, ErrInvalidInput
	}

	return s.repo.ListFilesByOwner(ctx, ownerType, ownerID)
}

func (s *FileService) LogFileAccess(
	ctx context.Context,
	fileID string,
	actorUserID string,
	action string,
	ipAddress string,
	userAgent string,
) error {
	fileID = strings.TrimSpace(fileID)
	actorUserID = strings.TrimSpace(actorUserID)
	action = strings.ToUpper(strings.TrimSpace(action))
	ipAddress = strings.TrimSpace(ipAddress)
	userAgent = strings.TrimSpace(userAgent)

	if fileID == "" || actorUserID == "" || action == "" {
		return ErrInvalidInput
	}

	return s.repo.LogFileAccess(ctx, fileID, actorUserID, action, ipAddress, userAgent)
}
