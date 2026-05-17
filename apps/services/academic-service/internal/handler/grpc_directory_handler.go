package handler

import (
	"context"
	"errors"

	"campus-flow/apps/services/academic-service/internal/model"
	"campus-flow/apps/services/academic-service/internal/service"
	academicv1 "campus-flow/proto/gen/academic/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ─── Departments ────────────────────────────────────────────────────────────

func toProtoDepartment(d *model.Department) *academicv1.DepartmentItem {
	return &academicv1.DepartmentItem{
		Id:        d.ID,
		Code:      d.Code,
		Name:      d.Name,
		CreatedAt: d.CreatedAt.Format("2006-01-02 15:04:05"),
	}
}

func toProtoStudent(s *model.Student) *academicv1.StudentItem {
	return &academicv1.StudentItem{
		Id:             s.ID,
		UserId:         s.UserID,
		Nim:            s.NIM,
		FullName:       s.FullName,
		Email:          s.Email,
		DepartmentId:   s.DepartmentID,
		DepartmentName: s.DepartmentName,
		Status:         s.Status,
		CreatedAt:      s.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:      s.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}

func toProtoLecturerProfile(l *model.LecturerProfile) *academicv1.LecturerItem {
	return &academicv1.LecturerItem{
		Id:                 l.ID,
		UserId:             l.UserID,
		Nidn:               l.NIDN,
		FullName:           l.FullName,
		Email:              l.Email,
		DepartmentId:       l.DepartmentID,
		DepartmentName:     l.DepartmentName,
		Status:             l.Status,
		MaxSupervisorQuota: l.MaxSupervisorQuota,
		CreatedAt:          l.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:          l.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}

func mapDirectoryError(err error) error {
	if errors.Is(err, service.ErrInvalidInput) {
		return status.Error(codes.InvalidArgument, "invalid directory input")
	}
	if errors.Is(err, service.ErrDirectoryNotFound) {
		return status.Error(codes.NotFound, "directory entry not found")
	}
	if errors.Is(err, service.ErrDirectoryDuplicate) {
		return status.Error(codes.AlreadyExists, "duplicate directory entry")
	}
	if errors.Is(err, service.ErrDirectoryInvalidStatus) {
		return status.Error(codes.InvalidArgument, "invalid status")
	}
	return status.Error(codes.Internal, err.Error())
}

func (h *AcademicHandler) ListDepartments(
	ctx context.Context,
	_ *academicv1.ListDepartmentsRequest,
) (*academicv1.ListDepartmentsResponse, error) {
	depts, err := h.academicService.ListDepartments(ctx)
	if err != nil {
		return nil, mapDirectoryError(err)
	}

	items := make([]*academicv1.DepartmentItem, 0, len(depts))
	for _, d := range depts {
		dCopy := d
		items = append(items, toProtoDepartment(&dCopy))
	}
	return &academicv1.ListDepartmentsResponse{Departments: items}, nil
}

func (h *AcademicHandler) CreateDepartment(
	ctx context.Context,
	req *academicv1.CreateDepartmentRequest,
) (*academicv1.DepartmentItemResponse, error) {
	d, err := h.academicService.CreateDepartment(ctx, req.Code, req.Name)
	if err != nil {
		return nil, mapDirectoryError(err)
	}
	return &academicv1.DepartmentItemResponse{Department: toProtoDepartment(d)}, nil
}

func (h *AcademicHandler) UpdateDepartment(
	ctx context.Context,
	req *academicv1.UpdateDepartmentRequest,
) (*academicv1.DepartmentItemResponse, error) {
	d, err := h.academicService.UpdateDepartment(ctx, req.Id, req.Code, req.Name)
	if err != nil {
		return nil, mapDirectoryError(err)
	}
	return &academicv1.DepartmentItemResponse{Department: toProtoDepartment(d)}, nil
}

func (h *AcademicHandler) ListStudents(
	ctx context.Context,
	req *academicv1.ListStudentsRequest,
) (*academicv1.ListStudentsResponse, error) {
	students, err := h.academicService.ListStudents(ctx, req.StatusFilter, req.Search)
	if err != nil {
		return nil, mapDirectoryError(err)
	}

	items := make([]*academicv1.StudentItem, 0, len(students))
	for _, s := range students {
		sCopy := s
		items = append(items, toProtoStudent(&sCopy))
	}
	return &academicv1.ListStudentsResponse{Students: items}, nil
}

func (h *AcademicHandler) UpsertStudent(
	ctx context.Context,
	req *academicv1.UpsertStudentRequest,
) (*academicv1.StudentItemResponse, error) {
	s, err := h.academicService.UpsertStudent(
		ctx,
		req.UserId,
		req.Nim,
		req.FullName,
		req.Email,
		req.DepartmentId,
	)
	if err != nil {
		return nil, mapDirectoryError(err)
	}
	return &academicv1.StudentItemResponse{Student: toProtoStudent(s)}, nil
}

func (h *AcademicHandler) SetStudentStatus(
	ctx context.Context,
	req *academicv1.SetStudentStatusRequest,
) (*academicv1.StudentItemResponse, error) {
	s, err := h.academicService.SetStudentStatus(ctx, req.UserId, req.Status)
	if err != nil {
		return nil, mapDirectoryError(err)
	}
	return &academicv1.StudentItemResponse{Student: toProtoStudent(s)}, nil
}

func (h *AcademicHandler) ListAllLecturers(
	ctx context.Context,
	req *academicv1.ListAllLecturersRequest,
) (*academicv1.ListLecturersResponse, error) {
	lecturers, err := h.academicService.ListAllLecturers(ctx, req.StatusFilter, req.Search)
	if err != nil {
		return nil, mapDirectoryError(err)
	}

	items := make([]*academicv1.LecturerItem, 0, len(lecturers))
	for _, l := range lecturers {
		lCopy := l
		items = append(items, toProtoLecturerProfile(&lCopy))
	}
	return &academicv1.ListLecturersResponse{Lecturers: items}, nil
}

func (h *AcademicHandler) UpsertLecturer(
	ctx context.Context,
	req *academicv1.UpsertLecturerRequest,
) (*academicv1.LecturerItemResponse, error) {
	l, err := h.academicService.UpsertLecturer(
		ctx,
		req.UserId,
		req.Nidn,
		req.FullName,
		req.Email,
		req.DepartmentId,
		req.MaxSupervisorQuota,
	)
	if err != nil {
		return nil, mapDirectoryError(err)
	}
	return &academicv1.LecturerItemResponse{Lecturer: toProtoLecturerProfile(l)}, nil
}

func (h *AcademicHandler) SetLecturerStatus(
	ctx context.Context,
	req *academicv1.SetLecturerStatusRequest,
) (*academicv1.LecturerItemResponse, error) {
	l, err := h.academicService.SetLecturerStatus(ctx, req.UserId, req.Status)
	if err != nil {
		return nil, mapDirectoryError(err)
	}
	return &academicv1.LecturerItemResponse{Lecturer: toProtoLecturerProfile(l)}, nil
}

// ListAuditLogs returns academic_db audit log entries (Epic 4).
func (h *AcademicHandler) ListAuditLogs(
	ctx context.Context,
	req *academicv1.ListAuditLogsRequest,
) (*academicv1.ListAuditLogsResponse, error) {
	items, err := h.academicService.ListAuditLogs(
		ctx,
		req.ActorUserId,
		req.Action,
		req.EntityType,
		int(req.Limit),
	)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	out := make([]*academicv1.AuditLogItem, 0, len(items))
	for _, it := range items {
		out = append(out, &academicv1.AuditLogItem{
			Id:            it.ID,
			ActorUserId:   it.ActorUserID,
			Action:        it.Action,
			EntityType:    it.EntityType,
			EntityId:      it.EntityID,
			MetadataJson:  it.MetadataJSON,
			CreatedAt:     it.CreatedAt,
			SourceService: "academic",
		})
	}
	return &academicv1.ListAuditLogsResponse{Items: out}, nil
}
