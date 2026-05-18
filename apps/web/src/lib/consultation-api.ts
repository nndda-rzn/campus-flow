import { apiFetch } from "./api";
import type { ApiResponse } from "@/types/auth";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConsultationSlot = {
  id: string;
  lecturerUserId: string;
  lecturerName: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  maxBookings: number;
  currentBookings: number;
  location: string;
  notes: string;
  isCancelled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ConsultationBookingStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "RESCHEDULED";

export type ConsultationBooking = {
  id: string;
  slotId: string;
  studentUserId: string;
  studentName: string;
  studentNim: string;
  topic: string;
  status: ConsultationBookingStatus;
  lecturerNotes: string;
  proposedSlotId: string;
  proposedSlot?: ConsultationSlot;
  createdAt: string;
  updatedAt: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  location: string;
  lecturerName: string;
};

// ─── Lecturer Slots ─────────────────────────────────────────────────────────

export async function listLecturerSlots(
  token: string,
  options?: { startDate?: string; endDate?: string; includeCancelled?: boolean }
) {
  const params = new URLSearchParams();
  if (options?.startDate) params.set("start_date", options.startDate);
  if (options?.endDate) params.set("end_date", options.endDate);
  if (options?.includeCancelled) params.set("include_cancelled", "true");
  const query = params.toString();
  const url = `/api/v1/lecturer/consultation-slots${query ? `?${query}` : ""}`;
  return apiFetch<ApiResponse<{ items: ConsultationSlot[] }>>(url, { token });
}

export type CreateSlotPayload = {
  slot_date: string;
  start_time: string;
  end_time: string;
  max_bookings?: number;
  location?: string;
  notes?: string;
};

export async function createSlot(token: string, payload: CreateSlotPayload) {
  return apiFetch<ApiResponse<ConsultationSlot>>(
    "/api/v1/lecturer/consultation-slots",
    {
      method: "POST",
      token,
      body: payload,
    }
  );
}

export type UpdateSlotPayload = {
  slot_date: string;
  start_time: string;
  end_time: string;
  max_bookings?: number;
  location?: string;
  notes?: string;
};

export async function updateSlot(
  token: string,
  slotId: string,
  payload: UpdateSlotPayload
) {
  return apiFetch<ApiResponse<ConsultationSlot>>(
    `/api/v1/lecturer/consultation-slots/${slotId}`,
    {
      method: "PUT",
      token,
      body: payload,
    }
  );
}

export async function cancelSlot(token: string, slotId: string) {
  return apiFetch<ApiResponse<ConsultationSlot>>(
    `/api/v1/lecturer/consultation-slots/${slotId}`,
    {
      method: "DELETE",
      token,
    }
  );
}

// ─── Lecturer Bookings ──────────────────────────────────────────────────────

export async function listLecturerBookings(
  token: string,
  statusFilter?: string
) {
  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);
  const query = params.toString();
  const url = `/api/v1/lecturer/consultation-bookings${query ? `?${query}` : ""}`;
  return apiFetch<ApiResponse<{ items: ConsultationBooking[] }>>(url, { token });
}

export async function approveBooking(
  token: string,
  bookingId: string,
  notes?: string
) {
  return apiFetch<ApiResponse<ConsultationBooking>>(
    `/api/v1/lecturer/consultation-bookings/${bookingId}/approve`,
    {
      method: "POST",
      token,
      body: { notes: notes ?? "" },
    }
  );
}

export async function rejectBooking(
  token: string,
  bookingId: string,
  notes?: string
) {
  return apiFetch<ApiResponse<ConsultationBooking>>(
    `/api/v1/lecturer/consultation-bookings/${bookingId}/reject`,
    {
      method: "POST",
      token,
      body: { notes: notes ?? "" },
    }
  );
}

export async function rescheduleBooking(
  token: string,
  bookingId: string,
  proposedSlotId: string,
  notes?: string
) {
  return apiFetch<ApiResponse<ConsultationBooking>>(
    `/api/v1/lecturer/consultation-bookings/${bookingId}/reschedule`,
    {
      method: "POST",
      token,
      body: { proposed_slot_id: proposedSlotId, notes: notes ?? "" },
    }
  );
}

// ─── Student Slots ──────────────────────────────────────────────────────────

export async function listAvailableSlots(token: string) {
  return apiFetch<ApiResponse<{ items: ConsultationSlot[] }>>(
    "/api/v1/student/consultation-slots",
    { token }
  );
}

// ─── Student Bookings ───────────────────────────────────────────────────────

export async function listStudentBookings(token: string) {
  return apiFetch<ApiResponse<{ items: ConsultationBooking[] }>>(
    "/api/v1/student/consultation-bookings",
    { token }
  );
}

export async function createBooking(
  token: string,
  slotId: string,
  topic: string
) {
  return apiFetch<ApiResponse<ConsultationBooking>>(
    "/api/v1/student/consultation-bookings",
    {
      method: "POST",
      token,
      body: { slot_id: slotId, topic },
    }
  );
}

export async function cancelBooking(token: string, bookingId: string) {
  return apiFetch<ApiResponse<ConsultationBooking>>(
    `/api/v1/student/consultation-bookings/${bookingId}`,
    {
      method: "DELETE",
      token,
    }
  );
}

export async function acceptReschedule(token: string, bookingId: string) {
  return apiFetch<ApiResponse<ConsultationBooking>>(
    `/api/v1/student/consultation-bookings/${bookingId}/accept-reschedule`,
    {
      method: "POST",
      token,
    }
  );
}
