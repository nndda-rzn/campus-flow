package handler

import (
	"context"

	"campus-flow/apps/services/academic-service/internal/service"
	academicv1 "campus-flow/proto/gen/academic/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func toProtoBulkResults(results []service.BulkImportRow) []*academicv1.BulkImportResultRow {
	out := make([]*academicv1.BulkImportResultRow, 0, len(results))
	for _, r := range results {
		out = append(out, &academicv1.BulkImportResultRow{
			RowNumber:  r.RowNumber,
			Identifier: r.Identifier,
			Outcome:    r.Outcome,
			Error:      r.Error,
		})
	}
	return out
}

func (h *AcademicHandler) BulkImportStudents(
	ctx context.Context,
	req *academicv1.BulkImportStudentsRequest,
) (*academicv1.BulkImportStudentsResponse, error) {
	rows := make([]service.StudentImportRow, 0, len(req.Rows))
	for _, r := range req.Rows {
		rows = append(rows, service.StudentImportRow{
			UserID:         r.UserId,
			Email:          r.Email,
			NIM:            r.Nim,
			FullName:       r.FullName,
			DepartmentCode: r.DepartmentCode,
		})
	}

	result, err := h.academicService.BulkImportStudents(ctx, rows, req.DryRun)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	return &academicv1.BulkImportStudentsResponse{
		Results: toProtoBulkResults(result.Results),
		Created: result.Created,
		Updated: result.Updated,
		Skipped: result.Skipped,
		Errors:  result.Errors,
	}, nil
}

func (h *AcademicHandler) BulkImportLecturers(
	ctx context.Context,
	req *academicv1.BulkImportLecturersRequest,
) (*academicv1.BulkImportLecturersResponse, error) {
	rows := make([]service.LecturerImportRow, 0, len(req.Rows))
	for _, r := range req.Rows {
		rows = append(rows, service.LecturerImportRow{
			UserID:             r.UserId,
			Email:              r.Email,
			NIDN:               r.Nidn,
			FullName:           r.FullName,
			DepartmentCode:     r.DepartmentCode,
			MaxSupervisorQuota: r.MaxSupervisorQuota,
		})
	}

	result, err := h.academicService.BulkImportLecturers(ctx, rows, req.DryRun)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	return &academicv1.BulkImportLecturersResponse{
		Results: toProtoBulkResults(result.Results),
		Created: result.Created,
		Updated: result.Updated,
		Skipped: result.Skipped,
		Errors:  result.Errors,
	}, nil
}
