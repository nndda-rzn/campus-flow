package service

import (
	"context"
	"errors"
	"strings"

	"campus-flow/apps/services/notification-service/internal/model"
	"campus-flow/apps/services/notification-service/internal/repository"
)

var (
	ErrInvalidInput          = errors.New("invalid input")
	ErrNotificationNotFound = errors.New("notification not found")
)

type NotificationService struct {
	repo *repository.NotificationRepository
}

func NewNotificationService(repo *repository.NotificationRepository) *NotificationService {
	return &NotificationService{
		repo: repo,
	}
}

func (s *NotificationService) CreateNotification(
	ctx context.Context,
	userID string,
	title string,
	message string,
	notificationType string,
	entityType string,
	entityID string,
) (*model.Notification, error) {
	userID = strings.TrimSpace(userID)
	title = strings.TrimSpace(title)
	message = strings.TrimSpace(message)
	notificationType = strings.ToUpper(strings.TrimSpace(notificationType))
	entityType = strings.TrimSpace(entityType)
	entityID = strings.TrimSpace(entityID)

	if notificationType == "" {
		notificationType = "INFO"
	}

	if userID == "" || title == "" || message == "" {
		return nil, ErrInvalidInput
	}

	if !isAllowedNotificationType(notificationType) {
		return nil, ErrInvalidInput
	}

	return s.repo.CreateNotification(ctx, model.Notification{
		UserID:     userID,
		Title:      title,
		Message:    message,
		Type:       notificationType,
		EntityType: entityType,
		EntityID:   entityID,
	})
}

func (s *NotificationService) ListMyNotifications(
	ctx context.Context,
	userID string,
) ([]model.Notification, error) {
	userID = strings.TrimSpace(userID)

	if userID == "" {
		return nil, ErrInvalidInput
	}

	return s.repo.ListByUserID(ctx, userID)
}

func (s *NotificationService) MarkNotificationAsRead(
	ctx context.Context,
	notificationID string,
	userID string,
) (*model.Notification, error) {
	notificationID = strings.TrimSpace(notificationID)
	userID = strings.TrimSpace(userID)

	if notificationID == "" || userID == "" {
		return nil, ErrInvalidInput
	}

	notification, err := s.repo.MarkAsRead(ctx, notificationID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotificationNotFound) {
			return nil, ErrNotificationNotFound
		}

		return nil, err
	}

	return notification, nil
}

func isAllowedNotificationType(notificationType string) bool {
	allowed := map[string]bool{
		"INFO":    true,
		"SUCCESS": true,
		"WARNING": true,
		"ERROR":   true,
	}

	return allowed[notificationType]
}