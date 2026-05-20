# Lecturer (Dosen) Feature Enhancement Specification

> **Status**: All Phases Complete ✅  
> **Created**: 2026-05-18  
> **Last Updated**: 2026-05-18  
> **Estimated Duration**: 10-13 days

---

## Overview

Menambahkan 3 fitur utama untuk role DOSEN:
1. **Thesis Progress Tracking** — View & complete milestone mahasiswa bimbingan ✅ DONE
2. **Consultation Scheduling** — Jadwal bimbingan dengan booking system ✅ DONE
3. **Enhanced Guidance Log** — Catatan dosen & file attachment ✅ DONE

---

## Current State (Existing Features)

Fitur dosen saat ini sangat minimal (4 halaman):

| Route | Purpose |
|-------|---------|
| `/lecturer` | Dashboard - KPI sederhana |
| `/lecturer/supervisor-requests` | Accept/Reject permintaan bimbingan |
| `/lecturer/guidance-logs` | Approve/Request revision logbook |
| `/lecturer/supervised-students` | Daftar mahasiswa bimbingan (read-only) |

---

## Phase 1: Thesis Progress Tracking (3-4 hari)

### Goal
Dosen bisa melihat dan update progress milestone mahasiswa bimbingan.

### Database Changes
Tidak ada migration baru. Menggunakan tabel existing:
- `thesis_milestones`
- `thesis_progress`
- `supervisor_requests`

### Proto Definitions

```protobuf
// New messages in proto/academic/v1/academic.proto

message SupervisedStudentProgress {
    string student_user_id = 1;
    string student_name = 2;
    string student_nim = 3;
    string topic_title = 4;
    string supervisor_request_id = 5;
    int32 total_milestones = 6;
    int32 completed_milestones = 7;
    string last_activity_at = 8;
    int32 days_since_last_activity = 9;
    repeated ThesisProgressItem progress = 10;
}

message ListSupervisedProgressRequest {
    string lecturer_user_id = 1;
    bool include_completed = 2;
    int32 stuck_threshold_days = 3;
}

message ListSupervisedProgressResponse {
    repeated SupervisedStudentProgress students = 1;
}

message CompleteMilestoneRequest {
    string progress_id = 1;
    string lecturer_user_id = 2;
    string notes = 3;
}

// New RPC methods
rpc ListSupervisedProgress(ListSupervisedProgressRequest) returns (ListSupervisedProgressResponse);
rpc GetStudentProgressDetail(GetStudentProgressDetailRequest) returns (SupervisedStudentProgress);
rpc CompleteMilestone(CompleteMilestoneRequest) returns (ThesisProgressResponse);
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/lecturer/supervised-students/progress` | List semua mahasiswa + progress |
| GET | `/api/v1/lecturer/supervised-students/{id}/progress` | Detail progress 1 mahasiswa |
| POST | `/api/v1/lecturer/thesis-progress/{id}/complete` | Mark milestone complete |

### Backend Tasks

1. **Repository** (`thesis_repo.go`)
   - [ ] `GetProgressByLecturer(ctx, lecturerUserID, includeCompleted, stuckDays)` 
   - [ ] `GetStudentProgressForLecturer(ctx, studentUserID, lecturerUserID)`

2. **Service** (`thesis_service.go`)
   - [ ] `ListSupervisedProgress(lecturerUserID, includeCompleted, stuckThresholdDays)`
   - [ ] `GetStudentProgressDetail(studentUserID, lecturerUserID)`
   - [ ] `CompleteMilestone(progressID, lecturerUserID, notes)` — validasi dosen adalah pembimbing

3. **Handler** (`thesis_handler.go`)
   - [ ] `ListSupervisedProgress` gRPC handler
   - [ ] `GetStudentProgressDetail` gRPC handler  
   - [ ] `CompleteMilestone` gRPC handler

4. **API Gateway** (`thesis_handler.go`)
   - [ ] `GET /api/v1/lecturer/supervised-students/progress`
   - [ ] `GET /api/v1/lecturer/supervised-students/{id}/progress`
   - [ ] `POST /api/v1/lecturer/thesis-progress/{id}/complete`

### Frontend Tasks

1. **Dosen Pages**
   - [ ] Enhance `/lecturer/supervised-students/page.tsx` — tambah progress bar per row
   - [ ] New `/lecturer/supervised-students/[id]/page.tsx` — detail + timeline milestone

2. **Components**
   - [ ] `ProgressTimeline` — visual timeline milestone
   - [ ] `MilestoneCard` — card per milestone dengan status
   - [ ] `CompleteDialog` — dialog untuk mark complete dengan notes

3. **Mahasiswa Enhancement**
   - [ ] `/student/thesis-progress` — tambah update notes & target date

### Validation Rules
- Dosen hanya bisa akses mahasiswa yang dibimbingnya (via `supervisor_requests`)
- Dosen hanya bisa complete milestone, tidak bisa revert

---

## Phase 2: Consultation Scheduling (5-6 hari)

### Goal
Sistem penjadwalan bimbingan dengan booking & approval flow.

### Database Migrations

#### Migration 000017: consultation_slots
```sql
-- db/academic-service/migrations/000017_create_consultation_slots.up.sql

CREATE TABLE consultation_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecturer_user_id UUID NOT NULL,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_bookings INT NOT NULL DEFAULT 1,
    location TEXT,
    notes TEXT,
    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_time_order CHECK (end_time > start_time),
    CONSTRAINT chk_max_bookings_positive CHECK (max_bookings > 0)
);

CREATE INDEX idx_consultation_slots_lecturer ON consultation_slots(lecturer_user_id);
CREATE INDEX idx_consultation_slots_date ON consultation_slots(slot_date);
CREATE INDEX idx_consultation_slots_available ON consultation_slots(lecturer_user_id, slot_date, is_cancelled) 
    WHERE is_cancelled = FALSE;
```

#### Migration 000018: consultation_bookings
```sql
-- db/academic-service/migrations/000018_create_consultation_bookings.up.sql

CREATE TYPE consultation_booking_status AS ENUM (
    'PENDING',
    'APPROVED', 
    'REJECTED',
    'CANCELLED',
    'RESCHEDULED'
);

CREATE TABLE consultation_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES consultation_slots(id),
    student_user_id UUID NOT NULL,
    topic TEXT NOT NULL,
    status consultation_booking_status NOT NULL DEFAULT 'PENDING',
    lecturer_notes TEXT,
    proposed_slot_id UUID REFERENCES consultation_slots(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_booking_per_slot_student UNIQUE (slot_id, student_user_id)
);

CREATE INDEX idx_consultation_bookings_slot ON consultation_bookings(slot_id);
CREATE INDEX idx_consultation_bookings_student ON consultation_bookings(student_user_id);
CREATE INDEX idx_consultation_bookings_status ON consultation_bookings(status);
```

### Proto Definitions

```protobuf
// Consultation Slots
message ConsultationSlot {
    string id = 1;
    string lecturer_user_id = 2;
    string slot_date = 3;        // YYYY-MM-DD
    string start_time = 4;       // HH:MM
    string end_time = 5;         // HH:MM
    int32 max_bookings = 6;
    int32 current_bookings = 7;  // computed
    string location = 8;
    string notes = 9;
    bool is_cancelled = 10;
    string created_at = 11;
}

message CreateConsultationSlotRequest {
    string lecturer_user_id = 1;
    string slot_date = 2;
    string start_time = 3;
    string end_time = 4;
    int32 max_bookings = 5;
    string location = 6;
    string notes = 7;
}

message UpdateConsultationSlotRequest {
    string id = 1;
    string slot_date = 2;
    string start_time = 3;
    string end_time = 4;
    int32 max_bookings = 5;
    string location = 6;
    string notes = 7;
}

message ListConsultationSlotsRequest {
    string lecturer_user_id = 1;
    string start_date = 2;
    string end_date = 3;
    bool include_cancelled = 4;
}

message ListConsultationSlotsResponse {
    repeated ConsultationSlot slots = 1;
}

message CancelSlotRequest {
    string id = 1;
    string lecturer_user_id = 2;
}

// Consultation Bookings
message ConsultationBooking {
    string id = 1;
    string slot_id = 2;
    string student_user_id = 3;
    string student_name = 4;
    string student_nim = 5;
    string topic = 6;
    string status = 7;
    string lecturer_notes = 8;
    string proposed_slot_id = 9;
    ConsultationSlot proposed_slot = 10;
    string created_at = 11;
    string slot_date = 12;
    string start_time = 13;
    string end_time = 14;
    string location = 15;
}

message CreateBookingRequest {
    string slot_id = 1;
    string student_user_id = 2;
    string topic = 3;
}

message BookingActionRequest {
    string booking_id = 1;
    string actor_user_id = 2;
    string notes = 3;
    string proposed_slot_id = 4;
}

message ListLecturerBookingsRequest {
    string lecturer_user_id = 1;
    string status = 2;
}

message ListLecturerBookingsResponse {
    repeated ConsultationBooking bookings = 1;
}

message ListStudentBookingsRequest {
    string student_user_id = 1;
}

message ListStudentBookingsResponse {
    repeated ConsultationBooking bookings = 1;
}

message ListAvailableSlotsRequest {
    string student_user_id = 1;
}

message ListAvailableSlotsResponse {
    repeated ConsultationSlot slots = 1;
}

message ExportSlotsICSRequest {
    string lecturer_user_id = 1;
    string start_date = 2;
    string end_date = 3;
}

message ExportSlotsICSResponse {
    string ics_content = 1;
}
```

### API Endpoints

#### Dosen Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/lecturer/consultation-slots` | List slots milik dosen |
| POST | `/api/v1/lecturer/consultation-slots` | Buat slot baru |
| PUT | `/api/v1/lecturer/consultation-slots/{id}` | Update slot |
| DELETE | `/api/v1/lecturer/consultation-slots/{id}` | Cancel slot |
| GET | `/api/v1/lecturer/consultation-slots/export` | Export .ics |
| GET | `/api/v1/lecturer/consultation-bookings` | List semua booking |
| POST | `/api/v1/lecturer/consultation-bookings/{id}/approve` | Approve |
| POST | `/api/v1/lecturer/consultation-bookings/{id}/reject` | Reject |
| POST | `/api/v1/lecturer/consultation-bookings/{id}/reschedule` | Reschedule |

#### Mahasiswa Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/student/consultation-slots` | Available slots |
| GET | `/api/v1/student/consultation-bookings` | Booking sendiri |
| POST | `/api/v1/student/consultation-bookings` | Book slot |
| DELETE | `/api/v1/student/consultation-bookings/{id}` | Cancel booking |
| POST | `/api/v1/student/consultation-bookings/{id}/accept-reschedule` | Accept reschedule |

### Backend Tasks

1. **Model** (`model/consultation.go`) — NEW FILE
   - [ ] `ConsultationSlot` struct
   - [ ] `ConsultationBooking` struct
   - [ ] `ConsultationBookingStatus` enum

2. **Repository** (`repository/consultation_repo.go`) — NEW FILE
   - [ ] `CreateSlot(ctx, slot)`
   - [ ] `UpdateSlot(ctx, slot)`
   - [ ] `CancelSlot(ctx, id, lecturerUserID)`
   - [ ] `GetSlotByID(ctx, id)`
   - [ ] `ListSlotsByLecturer(ctx, lecturerUserID, startDate, endDate, includeCancelled)`
   - [ ] `GetAvailableSlotsForStudent(ctx, studentUserID)` — filter by dosen pembimbing
   - [ ] `CheckSlotOverlap(ctx, lecturerUserID, date, startTime, endTime, excludeID)`
   - [ ] `CountBookingsForSlot(ctx, slotID)`
   - [ ] `CreateBooking(ctx, booking)`
   - [ ] `UpdateBookingStatus(ctx, id, status, notes, proposedSlotID)`
   - [ ] `GetBookingByID(ctx, id)`
   - [ ] `ListBookingsByLecturer(ctx, lecturerUserID, status)`
   - [ ] `ListBookingsByStudent(ctx, studentUserID)`
   - [ ] `GetBookingsBySlotID(ctx, slotID)` — untuk cascade cancel

3. **Service** (`service/consultation_service.go`) — NEW FILE
   - [ ] `CreateSlot` — validasi: tidak overlap, tidak di masa lalu
   - [ ] `UpdateSlot` — validasi: tidak overlap, slot belum lewat
   - [ ] `CancelSlot` — cascade cancel semua booking + trigger notifikasi
   - [ ] `ListSlotsByLecturer`
   - [ ] `GetAvailableSlotsForStudent`
   - [ ] `CreateBooking` — validasi: H-12 jam, kuota belum penuh, mahasiswa adalah bimbingan dosen
   - [ ] `ApproveBooking`
   - [ ] `RejectBooking`
   - [ ] `RescheduleBooking` — set proposed_slot_id
   - [ ] `CancelBooking` — by student
   - [ ] `AcceptReschedule` — buat booking baru di proposed slot
   - [ ] `ExportSlotsICS` — generate .ics untuk slots dengan booking approved

4. **Handler** (`handler/consultation_handler.go`) — NEW FILE
   - [ ] All gRPC handlers for above methods

5. **ICS Utility** (`util/ics.go`) — NEW FILE
   - [ ] `GenerateICS(slots []SlotWithBookings) string`

6. **Notification Events**
   - [ ] `consultation.booking.created` — notify dosen
   - [ ] `consultation.booking.approved` — notify mahasiswa
   - [ ] `consultation.booking.rejected` — notify mahasiswa
   - [ ] `consultation.booking.rescheduled` — notify mahasiswa
   - [ ] `consultation.slot.cancelled` — notify semua mahasiswa yang booking

7. **API Gateway** (`handler/consultation_handler.go`) — NEW FILE
   - [ ] All REST handlers

8. **Register in main.go**
   - [ ] academic-service: register consultation handler
   - [ ] api-gateway: register consultation routes

### Frontend Tasks

1. **Dosen Pages**
   - [ ] `/lecturer/consultation/page.tsx` — calendar view + list slots
   - [ ] `/lecturer/consultation/create/page.tsx` — form buat slot
   - [ ] `/lecturer/consultation/bookings/page.tsx` — manage bookings

2. **Mahasiswa Pages**
   - [ ] `/student/consultation/page.tsx` — available slots + my bookings

3. **Components**
   - [ ] `SlotCalendar` — calendar view
   - [ ] `SlotForm` — create/edit slot form
   - [ ] `SlotCard` — display slot info
   - [ ] `BookingList` — list bookings
   - [ ] `BookingActionDialog` — approve/reject/reschedule dialog
   - [ ] `AvailableSlots` — list available slots for student
   - [ ] `BookingForm` — form untuk booking
   - [ ] `MyBookings` — student's bookings list
   - [ ] `RescheduleDialog` — accept/reject reschedule

4. **API Client**
   - [ ] `lib/api/consultation-api.ts`

5. **Sidebar Update**
   - [ ] Add "Jadwal Bimbingan" menu for DOSEN
   - [ ] Add "Konsultasi" menu for MAHASISWA

### Validation Rules

| Rule | Implementation |
|------|----------------|
| Slot tidak boleh overlap | `CheckSlotOverlap` query sebelum create/update |
| Booking minimal H-12 jam | `slot_datetime - now() >= 12 hours` |
| Kuota slot | `COUNT(bookings) < max_bookings` |
| Mahasiswa hanya bisa book dosen pembimbingnya | Join dengan `supervisor_requests` |
| Cancel slot cascade | Transaction: update slot + update all bookings + publish events |

### Booking Status Flow

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
PENDING ──┬──► APPROVED ──► (selesai)                    │
          │                                               │
          ├──► REJECTED                                   │
          │                                               │
          ├──► CANCELLED (by student)                     │
          │                                               │
          └──► RESCHEDULED ──► student accepts ──► PENDING (new slot)
                    │                    │
                    │                    └──► student rejects ──► CANCELLED
                    │
                    └──► (slot lama tetap RESCHEDULED sebagai history)
```

---

## Phase 3: Enhanced Guidance Log (2-3 hari)

### Goal
Dosen bisa tambah catatan & attach file di guidance log.

### Database Migration

```sql
-- db/academic-service/migrations/000019_enhance_guidance_logs.up.sql

ALTER TABLE guidance_logs 
    ADD COLUMN lecturer_notes TEXT,
    ADD COLUMN milestone_id UUID REFERENCES thesis_milestones(id),
    ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN guidance_logs.attachments IS 
    'Array of {file_id, uploaded_by, filename, uploaded_at}';

CREATE INDEX idx_guidance_logs_milestone ON guidance_logs(milestone_id);
```

### Proto Updates

```protobuf
// Update existing GuidanceLogItem
message GuidanceLogItem {
    // ... existing fields ...
    string lecturer_notes = 15;
    string milestone_id = 16;
    string milestone_name = 17;
    repeated GuidanceLogAttachment attachments = 18;
}

message GuidanceLogAttachment {
    string file_id = 1;
    string filename = 2;
    string uploaded_by = 3;
    string uploaded_by_name = 4;
    string uploaded_at = 5;
}

message UpdateGuidanceLogNotesRequest {
    string log_id = 1;
    string lecturer_user_id = 2;
    string lecturer_notes = 3;
    string milestone_id = 4;
}

message AttachFileToLogRequest {
    string log_id = 1;
    string file_id = 2;
    string uploaded_by = 3;
    string filename = 4;
}

message RemoveAttachmentRequest {
    string log_id = 1;
    string file_id = 2;
    string actor_user_id = 3;
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/v1/lecturer/guidance-logs/{id}/notes` | Add/update notes |
| POST | `/api/v1/lecturer/guidance-logs/{id}/attachments` | Attach file |
| DELETE | `/api/v1/lecturer/guidance-logs/{id}/attachments/{fileId}` | Remove attachment |

### Backend Tasks

1. **Model Update** (`model/guidance_log.go`)
   - [ ] Add `LecturerNotes`, `MilestoneID`, `Attachments` fields
   - [ ] `GuidanceLogAttachment` struct

2. **Repository** (`guidance_log_repo.go`)
   - [ ] `UpdateLecturerNotes(ctx, logID, notes, milestoneID)`
   - [ ] `AddAttachment(ctx, logID, attachment)`
   - [ ] `RemoveAttachment(ctx, logID, fileID)`
   - [ ] Update existing queries to include new fields

3. **Service** (`guidance_log_service.go`)
   - [ ] `UpdateLecturerNotes` — validasi dosen adalah pembimbing
   - [ ] `AttachFile` — validasi file exists (optional: call file-service)
   - [ ] `RemoveAttachment` — validasi actor is uploader or dosen

4. **Handler** (`guidance_log_handler.go`)
   - [ ] `UpdateLogNotes` gRPC handler
   - [ ] `AttachFileToLog` gRPC handler
   - [ ] `RemoveAttachment` gRPC handler

5. **API Gateway** (`guidance_log_handler.go`)
   - [ ] `PUT /api/v1/lecturer/guidance-logs/{id}/notes`
   - [ ] `POST /api/v1/lecturer/guidance-logs/{id}/attachments`
   - [ ] `DELETE /api/v1/lecturer/guidance-logs/{id}/attachments/{fileId}`

### Frontend Tasks

1. **Enhance Dosen Page**
   - [ ] `/lecturer/guidance-logs/page.tsx` — add notes editor & file upload

2. **Components**
   - [ ] `LecturerNotesEditor` — inline text editor
   - [ ] `AttachmentUploader` — file upload with file-service
   - [ ] `AttachmentList` — display attachments with download/delete
   - [ ] `MilestoneTagSelector` — dropdown to tag milestone

---

## File Changes Summary

### New Files

| Path | Phase |
|------|-------|
| `db/academic-service/migrations/000017_create_consultation_slots.up.sql` | 2 |
| `db/academic-service/migrations/000017_create_consultation_slots.down.sql` | 2 |
| `db/academic-service/migrations/000018_create_consultation_bookings.up.sql` | 2 |
| `db/academic-service/migrations/000018_create_consultation_bookings.down.sql` | 2 |
| `db/academic-service/migrations/000019_enhance_guidance_logs.up.sql` | 3 |
| `db/academic-service/migrations/000019_enhance_guidance_logs.down.sql` | 3 |
| `apps/services/academic-service/internal/model/consultation.go` | 2 |
| `apps/services/academic-service/internal/repository/consultation_repo.go` | 2 |
| `apps/services/academic-service/internal/service/consultation_service.go` | 2 |
| `apps/services/academic-service/internal/handler/consultation_handler.go` | 2 |
| `apps/services/academic-service/internal/util/ics.go` | 2 |
| `apps/services/api-gateway/internal/handler/consultation_handler.go` | 2 |
| `apps/web/src/app/lecturer/consultation/page.tsx` | 2 |
| `apps/web/src/app/lecturer/consultation/create/page.tsx` | 2 |
| `apps/web/src/app/lecturer/consultation/bookings/page.tsx` | 2 |
| `apps/web/src/app/lecturer/supervised-students/[id]/page.tsx` | 1 |
| `apps/web/src/app/student/consultation/page.tsx` | 2 |
| `apps/web/src/lib/api/consultation-api.ts` | 2 |

### Modified Files

| Path | Phase | Changes |
|------|-------|---------|
| `proto/academic/v1/academic.proto` | 1,2,3 | New messages & RPCs |
| `apps/services/academic-service/internal/repository/thesis_repo.go` | 1 | Add lecturer queries |
| `apps/services/academic-service/internal/service/thesis_service.go` | 1 | Add lecturer methods |
| `apps/services/academic-service/internal/handler/thesis_handler.go` | 1 | Add lecturer handlers |
| `apps/services/academic-service/internal/model/guidance_log.go` | 3 | Add new fields |
| `apps/services/academic-service/internal/repository/guidance_log_repo.go` | 3 | Add notes/attachment methods |
| `apps/services/academic-service/internal/service/guidance_log_service.go` | 3 | Add notes/attachment logic |
| `apps/services/academic-service/internal/handler/guidance_log_handler.go` | 3 | Add notes/attachment handlers |
| `apps/services/academic-service/cmd/server/main.go` | 2 | Register consultation handler |
| `apps/services/api-gateway/internal/handler/thesis_handler.go` | 1 | Add lecturer endpoints |
| `apps/services/api-gateway/internal/handler/guidance_log_handler.go` | 3 | Add notes/attachment endpoints |
| `apps/services/api-gateway/cmd/server/main.go` | 2 | Register consultation routes |
| `apps/web/src/app/lecturer/supervised-students/page.tsx` | 1 | Add progress indicator |
| `apps/web/src/app/lecturer/guidance-logs/page.tsx` | 3 | Add notes & attachments UI |
| `apps/web/src/app/student/thesis-progress/page.tsx` | 1 | Add update capability |
| `apps/web/src/components/layout/sidebar.tsx` | 2 | Add consultation menu items |

---

## Implementation Checklist

### Phase 1: Thesis Progress Tracking
- [ ] Proto definitions
- [ ] Repository methods
- [ ] Service methods
- [ ] gRPC handlers
- [ ] API Gateway endpoints
- [ ] Frontend: enhanced supervised-students page
- [ ] Frontend: student detail page
- [ ] Frontend: student thesis-progress enhancement
- [ ] Testing

### Phase 2: Consultation Scheduling
- [ ] Database migrations
- [ ] Proto definitions
- [ ] Model structs
- [ ] Repository methods
- [ ] Service methods with validations
- [ ] gRPC handlers
- [ ] ICS export utility
- [ ] Notification events
- [ ] API Gateway endpoints
- [ ] Frontend: dosen consultation pages
- [ ] Frontend: student consultation page
- [ ] Frontend: sidebar updates
- [ ] Testing

### Phase 3: Enhanced Guidance Log
- [ ] Database migration
- [ ] Proto updates
- [ ] Model updates
- [ ] Repository methods
- [ ] Service methods
- [ ] gRPC handlers
- [ ] API Gateway endpoints
- [ ] Frontend: enhanced guidance-logs page
- [ ] Testing

---

## Notes & Decisions

1. **Slot overlap**: Tidak boleh overlap di hari yang sama untuk dosen yang sama
2. **Booking deadline**: Minimal H-12 jam sebelum slot
3. **Cancel policy**: Semua booking otomatis cancelled dengan notifikasi
4. **ICS export**: Hanya slot dengan booking APPROVED
5. **File attachment**: Menggunakan file-service yang sudah ada, simpan `file_id` di JSONB
6. **Milestone update**: Mahasiswa bisa update notes/target, dosen bisa mark complete
7. **Kuota slot**: Bisa 1 (one-on-one) atau lebih (bimbingan kelompok)
8. **Reschedule flow**: Dosen propose slot alternatif, mahasiswa accept/reject
