package handler

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	"campus-flow/apps/services/api-gateway/internal/middleware"
	filev1 "campus-flow/proto/gen/file/v1"
)

const maxUploadSize = 10 << 20 // 10 MB

type FileHandler struct {
	fileClient *client.FileClient
}

func NewFileHandler(fileClient *client.FileClient) *FileHandler {
	return &FileHandler{
		fileClient: fileClient,
	}
}

func (h *FileHandler) UploadAcademicSupportingDocument(w http.ResponseWriter, r *http.Request) {
	h.uploadAcademicFile(w, r, "SUPPORTING_DOCUMENT")
}

func (h *FileHandler) UploadAcademicFinalDocument(w http.ResponseWriter, r *http.Request) {
	h.uploadAcademicFile(w, r, "FINAL_DOCUMENT")
}

func (h *FileHandler) ListAcademicRequestFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	requestID := strings.TrimSpace(r.URL.Query().Get("request_id"))
	if requestID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "request_id is required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.fileClient.Client.ListFilesByOwner(ctx, &filev1.ListFilesByOwnerRequest{
		OwnerType: "ACADEMIC_REQUEST",
		OwnerId:   requestID,
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to list files",
		})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "list files success",
		Data:    res,
	})
}

func (h *FileHandler) uploadAcademicFile(w http.ResponseWriter, r *http.Request, purpose string) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Success: false,
			Message: "method not allowed",
		})
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, APIResponse{
			Success: false,
			Message: "missing user id",
		})
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "invalid multipart form or file too large",
		})
		return
	}

	requestID := strings.TrimSpace(r.FormValue("request_id"))
	if requestID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "request_id is required",
		})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "file is required",
		})
		return
	}
	defer file.Close()

	if header.Size <= 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "empty file is not allowed",
		})
		return
	}

	originalName := filepath.Base(header.Filename)
	ext := strings.ToLower(filepath.Ext(originalName))

	if !isAllowedUploadExtension(ext) {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "file extension not allowed",
		})
		return
	}

	randomName, err := randomHex(16)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{
			Success: false,
			Message: "failed to generate file name",
		})
		return
	}

	storedName := randomName + ext

	uploadDir := filepath.Join("storage", "uploads", "academic-requests", requestID, strings.ToLower(purpose))
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{
			Success: false,
			Message: "failed to create upload directory",
		})
		return
	}

	storagePath := filepath.Join(uploadDir, storedName)

	dst, err := os.Create(storagePath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{
			Success: false,
			Message: "failed to create uploaded file",
		})
		return
	}
	defer dst.Close()

	written, err := io.Copy(dst, file)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{
			Success: false,
			Message: "failed to save uploaded file",
		})
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.fileClient.Client.RegisterUploadedFile(ctx, &filev1.RegisterUploadedFileRequest{
		OriginalName:     originalName,
		StoredName:       storedName,
		StoragePath:      filepath.ToSlash(storagePath),
		MimeType:         mimeType,
		SizeBytes:        written,
		UploadedByUserId: userID,
		OwnerType:        "ACADEMIC_REQUEST",
		OwnerId:          requestID,
		Purpose:          purpose,
	})
	if err != nil {
		_ = os.Remove(storagePath)

		writeJSON(w, http.StatusBadGateway, APIResponse{
			Success: false,
			Message: "failed to register file metadata",
		})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: "upload file success",
		Data:    res,
	})
}

func isAllowedUploadExtension(ext string) bool {
	allowed := map[string]bool{
		".pdf":  true,
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".doc":  true,
		".docx": true,
	}

	return allowed[ext]
}

func randomHex(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	return hex.EncodeToString(bytes), nil
}