package worker

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"time"

	"campus-flow/apps/services/notification-service/internal/repository"
	"campus-flow/apps/services/notification-service/internal/service"

	amqp "github.com/rabbitmq/amqp091-go"
)

type RequestEventPayload struct {
	RequestID     string `json:"request_id"`
	RequestNumber string `json:"request_number"`
	StudentUserID string `json:"student_user_id"`
	OldStatus     string `json:"old_status"`
	Status        string `json:"status"`
	ServiceCode   string `json:"service_code"`
	ServiceName   string `json:"service_name"`
	Title         string `json:"title"`
	TopicTitle    string `json:"topic_title"`
	ActorUserID   string `json:"actor_user_id"`
	ActorRole     string `json:"actor_role"`
	Note          string `json:"note"`
}

func StartNotificationConsumer(
	ctx context.Context,
	deliveries <-chan amqp.Delivery,
	eventRepo *repository.EventRepository,
	notificationService *service.NotificationService,
) {
	log.Println("Notification consumer started")

	for {
		select {
		case <-ctx.Done():
			log.Println("Notification consumer stopped")
			return

		case delivery, ok := <-deliveries:
			if !ok {
				log.Println("Notification delivery channel closed")
				return
			}

			handleDelivery(ctx, delivery, eventRepo, notificationService)
		}
	}
}

func handleDelivery(
	ctx context.Context,
	delivery amqp.Delivery,
	eventRepo *repository.EventRepository,
	notificationService *service.NotificationService,
) {
	eventID := delivery.MessageId
	eventType := delivery.RoutingKey

	if eventID == "" {
		log.Println("event ignored: missing message id")
		_ = delivery.Nack(false, false)
		return
	}

	processCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	inserted, err := eventRepo.SaveInboxEvent(
		processCtx,
		eventID,
		eventType,
		delivery.Body,
	)
	if err != nil {
		log.Printf("failed to save inbox event %s: %v", eventID, err)
		_ = delivery.Nack(false, true)
		return
	}

	if !inserted {
		log.Printf("duplicate event ignored: %s", eventID)
		_ = delivery.Ack(false)
		return
	}

	if err := createNotificationFromEvent(processCtx, notificationService, eventType, delivery.Body); err != nil {
		log.Printf("failed to process event %s: %v", eventID, err)
		_ = delivery.Nack(false, false)
		return
	}

	if err := eventRepo.MarkInboxEventProcessed(processCtx, eventID); err != nil {
		log.Printf("failed to mark inbox event processed %s: %v", eventID, err)
		_ = delivery.Nack(false, true)
		return
	}

	_ = delivery.Ack(false)
	log.Printf("notification event processed: %s", eventType)
}

func createNotificationFromEvent(
	ctx context.Context,
	notificationService *service.NotificationService,
	eventType string,
	body []byte,
) error {
	var payload RequestEventPayload

	if err := json.Unmarshal(body, &payload); err != nil {
		return err
	}

	title, message, notificationType := buildNotificationContent(eventType, payload)

	entityType := "ACADEMIC_REQUEST"
	if strings.HasPrefix(eventType, "supervisor_request.") {
		entityType = "SUPERVISOR_REQUEST"
	}

	_, err := notificationService.CreateNotification(
		ctx,
		payload.StudentUserID,
		title,
		message,
		notificationType,
		entityType,
		payload.RequestID,
	)

	return err
}

func buildNotificationContent(
	eventType string,
	payload RequestEventPayload,
) (string, string, string) {
	switch eventType {
	case "academic_request.created":
		return "Pengajuan berhasil dibuat",
			"Pengajuan layanan akademik Anda berhasil dibuat dengan nomor " + payload.RequestNumber + ".",
			"SUCCESS"

	case "academic_request.verified":
		return "Pengajuan sudah diverifikasi",
			"Pengajuan layanan akademik Anda sudah diverifikasi oleh Admin Prodi.",
			"INFO"

	case "academic_request.approved":
		return "Pengajuan disetujui",
			"Pengajuan layanan akademik Anda sudah disetujui oleh Kaprodi.",
			"SUCCESS"

	case "academic_request.rejected":
		return "Pengajuan ditolak",
			"Pengajuan layanan akademik Anda ditolak. Silakan periksa catatan pengajuan.",
			"WARNING"

	case "academic_request.completed":
		return "Pengajuan selesai",
			"Pengajuan layanan akademik Anda sudah selesai diproses.",
			"SUCCESS"

	case "supervisor_request.created":
		return "Pengajuan pembimbing berhasil dibuat",
			"Pengajuan dosen pembimbing Anda berhasil dibuat dengan nomor " + payload.RequestNumber + ".",
			"SUCCESS"

	case "supervisor_request.verified":
		return "Pengajuan pembimbing diverifikasi",
			"Pengajuan dosen pembimbing Anda sudah diverifikasi oleh Admin Prodi.",
			"INFO"

	case "supervisor_request.assigned":
		return "Dosen pembimbing ditetapkan",
			"Kaprodi sudah menetapkan dosen pembimbing untuk pengajuan Anda.",
			"SUCCESS"

	case "supervisor_request.accepted":
		return "Dosen menerima penetapan",
			"Dosen yang ditetapkan telah menerima pengajuan pembimbing Anda.",
			"SUCCESS"

	case "supervisor_request.rejected":
		return "Dosen menolak penetapan",
			"Dosen yang ditetapkan menolak pengajuan pembimbing Anda.",
			"WARNING"

	default:
		return "Status pengajuan diperbarui",
			"Status pengajuan Anda berubah menjadi " + payload.Status + ".",
			"INFO"
	}
}
