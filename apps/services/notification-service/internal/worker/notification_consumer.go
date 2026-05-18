package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"campus-flow/apps/services/notification-service/internal/client"
	"campus-flow/apps/services/notification-service/internal/repository"
	"campus-flow/apps/services/notification-service/internal/service"

	amqp "github.com/rabbitmq/amqp091-go"
)

type RequestEventPayload struct {
	RequestID      string `json:"request_id"`
	RequestNumber  string `json:"request_number"`
	StudentUserID  string `json:"student_user_id"`
	OldStatus      string `json:"old_status"`
	Status         string `json:"status"`
	ServiceCode    string `json:"service_code"`
	ServiceName    string `json:"service_name"`
	Title          string `json:"title"`
	TopicTitle     string `json:"topic_title"`
	ActorUserID    string `json:"actor_user_id"`
	ActorRole      string `json:"actor_role"`
	Note           string `json:"note"`
	LecturerID     string `json:"lecturer_id"`
	LecturerUserID string `json:"lecturer_user_id"`

	// Reminder fields
	BookingID   string `json:"booking_id"`
	Topic       string `json:"topic"`
	SlotDate    string `json:"slot_date"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
	Location    string `json:"location"`
	StudentName string `json:"student_name"`
	LecturerName string `json:"lecturer_name"`
	DaysStuck   int    `json:"days_stuck"`
}

func StartNotificationConsumer(
	ctx context.Context,
	deliveries <-chan amqp.Delivery,
	eventRepo *repository.EventRepository,
	notificationService *service.NotificationService,
	authClient *client.AuthClient,
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

			handleDelivery(ctx, delivery, eventRepo, notificationService, authClient)
		}
	}
}

func handleDelivery(
	ctx context.Context,
	delivery amqp.Delivery,
	eventRepo *repository.EventRepository,
	notificationService *service.NotificationService,
	authClient *client.AuthClient,
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

	if err := createNotificationFromEvent(processCtx, notificationService, authClient, eventType, delivery.Body); err != nil {
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
	authClient *client.AuthClient,
	eventType string,
	body []byte,
) error {
	var payload RequestEventPayload

	if err := json.Unmarshal(body, &payload); err != nil {
		return err
	}

	// Some events do not produce a notification.
	if isSilentEvent(eventType) {
		return nil
	}

	title, message, notificationType := buildNotificationContent(eventType, payload)

	entityType := "ACADEMIC_REQUEST"
	if strings.HasPrefix(eventType, "supervisor_request.") {
		entityType = "SUPERVISOR_REQUEST"
	} else if strings.HasPrefix(eventType, "consultation_booking.") {
		entityType = "CONSULTATION_BOOKING"
	} else if strings.HasPrefix(eventType, "thesis_progress.") {
		entityType = "THESIS_PROGRESS"
	}

	// Determine recipients per event type.
	recipients := resolveRecipients(ctx, eventType, payload, authClient)
	if len(recipients) == 0 {
		return nil
	}

	// Determine entity ID per event type
	entityID := payload.RequestID
	if entityType == "CONSULTATION_BOOKING" {
		entityID = payload.BookingID
	}

	seen := make(map[string]bool, len(recipients))
	for _, recipient := range recipients {
		if recipient == "" || seen[recipient] {
			continue
		}
		seen[recipient] = true

		if _, err := notificationService.CreateNotification(
			ctx,
			recipient,
			title,
			message,
			notificationType,
			entityType,
			entityID,
		); err != nil {
			return err
		}
	}

	return nil
}

// isSilentEvent returns true for events that should NOT produce a notification.
// We don't notify the student about their own cancellation, and we don't notify
// anyone for a transient ACCEPTED state since COMPLETED follows immediately.
func isSilentEvent(eventType string) bool {
	switch eventType {
	case "academic_request.cancelled", "supervisor_request.cancelled":
		return true
	case "supervisor_request.accepted":
		// ACCEPTED is followed immediately by supervisor_request.completed in
		// the same transaction. We notify on completed, not accepted.
		return true
	default:
		return false
	}
}

// resolveRecipients returns the list of user IDs that should receive a
// notification for the given event.
func resolveRecipients(
	ctx context.Context,
	eventType string,
	payload RequestEventPayload,
	authClient *client.AuthClient,
) []string {
	switch eventType {
	case "supervisor_request.assigned":
		// Notify both the student (so they can track) and the lecturer
		// (so they can act on the assignment).
		recipients := []string{payload.StudentUserID}
		if payload.LecturerUserID != "" {
			recipients = append(recipients, payload.LecturerUserID)
		}
		return recipients

	case "supervisor_request.completed", "supervisor_request.rejected":
		// FR-130: notify mahasiswa AND every active Kaprodi when the
		// lecturer accepts (auto-completed) or rejects the assignment.
		recipients := []string{payload.StudentUserID}
		if authClient != nil {
			kaprodiIDs := authClient.ListUserIDsByRole(ctx, "KAPRODI")
			recipients = append(recipients, kaprodiIDs...)
		}
		return recipients

	case "consultation_booking.reminder":
		// Notify both student and lecturer about upcoming consultation
		recipients := []string{}
		if payload.StudentUserID != "" {
			recipients = append(recipients, payload.StudentUserID)
		}
		if payload.LecturerUserID != "" {
			recipients = append(recipients, payload.LecturerUserID)
		}
		return recipients

	case "thesis_progress.stuck_warning":
		// Notify both student (warning) and lecturer (info)
		recipients := []string{}
		if payload.StudentUserID != "" {
			recipients = append(recipients, payload.StudentUserID)
		}
		if payload.LecturerUserID != "" {
			recipients = append(recipients, payload.LecturerUserID)
		}
		return recipients

	default:
		return []string{payload.StudentUserID}
	}
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
			rejectionMessage("Pengajuan layanan akademik Anda ditolak.", payload.Note),
			"WARNING"

	case "academic_request.completed":
		return "Pengajuan selesai",
			"Pengajuan layanan akademik Anda sudah selesai diproses.",
			"SUCCESS"

	case "academic_request.revision_required":
		return "Pengajuan perlu revisi",
			revisionMessage("Admin Prodi meminta revisi terhadap pengajuan layanan akademik Anda.", payload.Note),
			"WARNING"

	case "academic_request.sla_warning":
		return "Pengajuan mendekati batas waktu",
			fmt.Sprintf(
				"Pengajuan %s sudah hampir mencapai batas SLA. Status saat ini: %s.",
				payload.RequestNumber, payload.Status,
			),
			"WARNING"

	case "supervisor_request.created":
		return "Pengajuan pembimbing berhasil dibuat",
			"Pengajuan dosen pembimbing Anda berhasil dibuat dengan nomor " + payload.RequestNumber + ".",
			"SUCCESS"

	case "supervisor_request.verified":
		return "Pengajuan pembimbing diverifikasi",
			"Pengajuan dosen pembimbing Anda sudah diverifikasi oleh Admin Prodi.",
			"INFO"

	case "supervisor_request.assigned":
		return "Penetapan dosen pembimbing",
			"Kaprodi sudah menetapkan dosen pembimbing untuk pengajuan ini. Mohon ditindaklanjuti.",
			"INFO"

	case "supervisor_request.rejected":
		return "Dosen menolak penetapan",
			rejectionMessage("Dosen yang ditetapkan menolak pengajuan pembimbing Anda.", payload.Note),
			"WARNING"

	case "supervisor_request.revision_required":
		return "Pengajuan pembimbing perlu revisi",
			revisionMessage("Admin Prodi meminta revisi terhadap pengajuan pembimbing Anda.", payload.Note),
			"WARNING"

	case "supervisor_request.completed":
		return "Penetapan pembimbing selesai",
			"Dosen telah menerima penetapan. Pengajuan dosen pembimbing Anda selesai diproses.",
			"SUCCESS"

	case "consultation_booking.reminder":
		location := payload.Location
		if location == "" {
			location = "(belum ditentukan)"
		}
		return "Pengingat: Jadwal Bimbingan Besok",
			fmt.Sprintf(
				"Anda memiliki jadwal bimbingan pada %s pukul %s di %s. Topik: %s.",
				payload.SlotDate, payload.StartTime, location, payload.Topic,
			),
			"INFO"

	case "thesis_progress.stuck_warning":
		return "Peringatan Progress Skripsi",
			fmt.Sprintf(
				"Tidak ada aktivitas bimbingan/progress selama %d hari terakhir untuk skripsi: %s. Mohon segera ditindaklanjuti.",
				payload.DaysStuck, payload.TopicTitle,
			),
			"WARNING"

	default:
		return "Status pengajuan diperbarui",
			"Status pengajuan Anda berubah menjadi " + payload.Status + ".",
			"INFO"
	}
}

func revisionMessage(prefix, note string) string {
	if note == "" {
		return prefix + " Silakan periksa detail pengajuan."
	}
	return prefix + " Catatan: " + note
}

func rejectionMessage(prefix, note string) string {
	if note == "" {
		return prefix + " Silakan periksa detail pengajuan."
	}
	return prefix + " Alasan: " + note
}
