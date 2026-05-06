package handler

import (
	"context"
	"errors"

	"campus-flow/apps/services/notification-service/internal/model"
	"campus-flow/apps/services/notification-service/internal/service"
	notificationv1 "campus-flow/proto/gen/notification/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type NotificationHandler struct {
	notificationv1.UnimplementedNotificationServiceServer
	notificationService *service.NotificationService
}

func NewNotificationHandler(notificationService *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
	}
}

func (h *NotificationHandler) CreateNotification(
	ctx context.Context,
	req *notificationv1.CreateNotificationRequest,
) (*notificationv1.NotificationResponse, error) {
	created, err := h.notificationService.CreateNotification(
		ctx,
		req.UserId,
		req.Title,
		req.Message,
		req.Type,
		req.EntityType,
		req.EntityId,
	)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return nil, status.Error(codes.InvalidArgument, "invalid notification input")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &notificationv1.NotificationResponse{
		Notification: toProtoNotification(created),
	}, nil
}

func (h *NotificationHandler) ListMyNotifications(
	ctx context.Context,
	req *notificationv1.ListMyNotificationsRequest,
) (*notificationv1.ListNotificationsResponse, error) {
	notifications, err := h.notificationService.ListMyNotifications(ctx, req.UserId)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return nil, status.Error(codes.InvalidArgument, "user_id is required")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	items := make([]*notificationv1.NotificationItem, 0, len(notifications))
	for _, notification := range notifications {
		notificationCopy := notification
		items = append(items, toProtoNotification(&notificationCopy))
	}

	return &notificationv1.ListNotificationsResponse{
		Notifications: items,
	}, nil
}

func (h *NotificationHandler) MarkNotificationAsRead(
	ctx context.Context,
	req *notificationv1.MarkNotificationAsReadRequest,
) (*notificationv1.NotificationResponse, error) {
	updated, err := h.notificationService.MarkNotificationAsRead(
		ctx,
		req.NotificationId,
		req.UserId,
	)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return nil, status.Error(codes.InvalidArgument, "notification_id and user_id are required")
		}

		if errors.Is(err, service.ErrNotificationNotFound) {
			return nil, status.Error(codes.NotFound, "notification not found")
		}

		return nil, status.Error(codes.Internal, err.Error())
	}

	return &notificationv1.NotificationResponse{
		Notification: toProtoNotification(updated),
	}, nil
}

func toProtoNotification(notification *model.Notification) *notificationv1.NotificationItem {
	readAt := ""
	if notification.ReadAt != nil {
		readAt = notification.ReadAt.Format("2006-01-02 15:04:05")
	}

	return &notificationv1.NotificationItem{
		Id:         notification.ID,
		UserId:     notification.UserID,
		Title:      notification.Title,
		Message:    notification.Message,
		Type:       notification.Type,
		EntityType: notification.EntityType,
		EntityId:   notification.EntityID,
		IsRead:     notification.IsRead,
		CreatedAt:  notification.CreatedAt.Format("2006-01-02 15:04:05"),
		ReadAt:     readAt,
	}
}