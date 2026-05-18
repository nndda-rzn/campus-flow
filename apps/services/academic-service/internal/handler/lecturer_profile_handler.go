package handler

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "campus-flow/proto/gen/academic/v1"
)

func (h *AcademicHandler) GetLecturerProfile(ctx context.Context, req *pb.GetLecturerProfileRequest) (*pb.LecturerProfileResponse, error) {
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	profile, err := h.academicService.GetLecturerProfile(ctx, req.UserId)
	if err != nil {
		return nil, err
	}

	return &pb.LecturerProfileResponse{
		Id:                  profile.ID,
		UserId:              profile.UserID,
		Nidn:                profile.NIDN,
		FullName:            profile.FullName,
		Email:               profile.Email,
		DepartmentId:        profile.DepartmentID,
		DepartmentName:      profile.DepartmentName,
		Status:              profile.Status,
		MaxSupervisorQuota:  int32(profile.MaxSupervisorQuota),
		CurrentQuotaUsed:    int32(profile.CurrentQuotaUsed),
		CreatedAt:           profile.CreatedAt,
		UpdatedAt:           profile.UpdatedAt,
	}, nil
}

func (h *AcademicHandler) UpdateLecturerProfile(ctx context.Context, req *pb.UpdateLecturerProfileRequest) (*pb.LecturerProfileResponse, error) {
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	profile, err := h.academicService.UpdateLecturerProfile(ctx, req.UserId, req.FullName, req.Email, req.Nidn)
	if err != nil {
		return nil, err
	}

	return &pb.LecturerProfileResponse{
		Id:                  profile.ID,
		UserId:              profile.UserID,
		Nidn:                profile.NIDN,
		FullName:            profile.FullName,
		Email:               profile.Email,
		DepartmentId:        profile.DepartmentID,
		DepartmentName:      profile.DepartmentName,
		Status:              profile.Status,
		MaxSupervisorQuota:  int32(profile.MaxSupervisorQuota),
		CurrentQuotaUsed:    int32(profile.CurrentQuotaUsed),
		CreatedAt:           profile.CreatedAt,
		UpdatedAt:           profile.UpdatedAt,
	}, nil
}

func (h *AcademicHandler) GetLecturerDashboard(ctx context.Context, req *pb.GetLecturerDashboardRequest) (*pb.GetLecturerDashboardResponse, error) {
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	dashboard, err := h.academicService.GetLecturerDashboard(ctx, req.UserId)
	if err != nil {
		return nil, err
	}

	recentRequests := make([]*pb.SupervisorRequestSummary, len(dashboard.RecentRequests))
	for i, r := range dashboard.RecentRequests {
		recentRequests[i] = &pb.SupervisorRequestSummary{
			Id:          r.ID,
			StudentName: r.StudentName,
			TopicTitle:  r.TopicTitle,
			Status:      r.Status,
			CreatedAt:   r.CreatedAt,
		}
	}

	pendingBookings := make([]*pb.ConsultationBookingSummary, len(dashboard.PendingBookings))
	for i, b := range dashboard.PendingBookings {
		pendingBookings[i] = &pb.ConsultationBookingSummary{
			Id:          b.ID,
			StudentName: b.StudentName,
			Topic:       b.Topic,
			SlotDate:    b.SlotDate,
			StartTime:   b.StartTime,
		}
	}

	return &pb.GetLecturerDashboardResponse{
		TotalSupervisedStudents:      int32(dashboard.TotalSupervisedStudents),
		PendingSupervisorRequests:    int32(dashboard.PendingSupervisorRequests),
		PendingConsultationBookings:  int32(dashboard.PendingConsultationBookings),
		QuotaUsed:                    int32(dashboard.QuotaUsed),
		QuotaMax:                     int32(dashboard.QuotaMax),
		RecentRequests:               recentRequests,
		PendingBookings:              pendingBookings,
	}, nil
}

func (h *AcademicHandler) GetLecturerQuota(ctx context.Context, req *pb.GetLecturerQuotaRequest) (*pb.GetLecturerQuotaResponse, error) {
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	quota, err := h.academicService.GetLecturerQuota(ctx, req.UserId, req.AcademicYearId)
	if err != nil {
		return nil, err
	}

	details := make([]*pb.QuotaDetail, len(quota.Details))
	for i, d := range quota.Details {
		details[i] = &pb.QuotaDetail{
			StudentName: d.StudentName,
			RequestId:   d.RequestID,
			Status:      d.Status,
		}
	}

	return &pb.GetLecturerQuotaResponse{
		AcademicYearId:   quota.AcademicYearID,
		AcademicYearName: quota.AcademicYearName,
		MaxQuota:         int32(quota.MaxQuota),
		CurrentUsed:      int32(quota.CurrentUsed),
		Available:        int32(quota.Available),
		Details:          details,
	}, nil
}
