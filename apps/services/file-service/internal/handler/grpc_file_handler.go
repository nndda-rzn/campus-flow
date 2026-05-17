package handler

import (
	"context"
	"errors"

	"campus-flow/apps/services/file-service/internal/model"
	"campus-flow/apps/services/file-service/internal/service"
	filev1 "campus-flow/proto/gen/file/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type FileHandler struct {
	filev1.UnimplementedFileServiceServer
	fileService *service.FileService
}

func NewFileHandler(fileService *service.FileService) *FileHandler {
	return &FileHandler{
		fileService: fileService,
	}
}

func (h *FileHandler) RegisterUploadedFile(
	ctx context.Context,
	req *filev1.RegisterUploadedFileRequest,
) (*filev1.FileResponse, error) {
	created, err := h.fileService.RegisterUploadedFile(ctx, model.File{
		OriginalName:     req.OriginalName,
		StoredName:       req.StoredName,
		StoragePath:      req.StoragePath,
		MimeType:         req.MimeType,
		SizeBytes:        req.SizeBytes,
		UploadedByUserID: req.UploadedByUserId,
		OwnerType:        req.OwnerType,
		OwnerID:          req.OwnerId,
		Purpose:          req.Purpose,
	})
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return nil, status.Error(codes.InvalidArgument, "invalid file metadata")
		}
		if errors.Is(err, service.ErrEmptyMime) {
			return nil, status.Error(codes.InvalidArgument, "mime type is required")
		}
		if errors.Is(err, service.ErrEmptyFileSize) {
			return nil, status.Error(codes.InvalidArgument, "file size must be greater than zero")
		}
		if errors.Is(err, service.ErrMimeRejected) {
			return nil, status.Error(codes.FailedPrecondition, "mime type not allowed")
		}
		if errors.Is(err, service.ErrSizeRejected) {
			return nil, status.Error(codes.FailedPrecondition, "file size exceeds limit")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &filev1.FileResponse{
		File: toProtoFile(created),
	}, nil
}

func (h *FileHandler) GetFileMetadata(
	ctx context.Context,
	req *filev1.GetFileMetadataRequest,
) (*filev1.FileResponse, error) {
	file, err := h.fileService.GetFileMetadata(ctx, req.FileId)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return nil, status.Error(codes.InvalidArgument, "file_id is required")
		}

		if errors.Is(err, service.ErrFileNotFound) {
			return nil, status.Error(codes.NotFound, "file not found")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &filev1.FileResponse{
		File: toProtoFile(file),
	}, nil
}

func (h *FileHandler) ListFilesByOwner(
	ctx context.Context,
	req *filev1.ListFilesByOwnerRequest,
) (*filev1.ListFilesResponse, error) {
	files, err := h.fileService.ListFilesByOwner(ctx, req.OwnerType, req.OwnerId)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return nil, status.Error(codes.InvalidArgument, "owner_type and owner_id are required")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	items := make([]*filev1.FileItem, 0, len(files))
	for _, file := range files {
		fileCopy := file
		items = append(items, toProtoFile(&fileCopy))
	}

	return &filev1.ListFilesResponse{
		Files: items,
	}, nil
}

func toProtoFile(file *model.File) *filev1.FileItem {
	return &filev1.FileItem{
		Id:               file.ID,
		OriginalName:     file.OriginalName,
		StoredName:       file.StoredName,
		StoragePath:      file.StoragePath,
		MimeType:         file.MimeType,
		SizeBytes:        file.SizeBytes,
		UploadedByUserId: file.UploadedByUserID,
		OwnerType:        file.OwnerType,
		OwnerId:          file.OwnerID,
		Purpose:          file.Purpose,
		Status:           file.Status,
		CreatedAt:        file.CreatedAt.Format("2006-01-02 15:04:05"),
	}
}

func (h *FileHandler) LogFileAccess(
	ctx context.Context,
	req *filev1.LogFileAccessRequest,
) (*filev1.LogFileAccessResponse, error) {
	err := h.fileService.LogFileAccess(
		ctx,
		req.FileId,
		req.ActorUserId,
		req.Action,
		req.IpAddress,
		req.UserAgent,
	)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return nil, status.Error(codes.InvalidArgument, "file_id, actor_user_id, and action are required")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &filev1.LogFileAccessResponse{
		Success: true,
	}, nil
}