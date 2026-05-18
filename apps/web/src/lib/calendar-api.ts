import { apiFetch } from "./api";
import type { ApiResponse } from "@/types/auth";

export type CalendarEventType = "UTS" | "UAS" | "REGISTRATION" | "HOLIDAY" | "DEADLINE" | "SEMINAR" | "OTHER";

export type AcademicCalendarItem = {
  id: string;
  academicYearId: string;
  departmentId?: string;
  title: string;
  description: string;
  eventType: CalendarEventType;
  startDate: string;
  endDate?: string;
  isAllDay: boolean;
  targetRoles: string[];
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export async function getAcademicCalendar(token: string, params?: { startDate?: string; endDate?: string; departmentId?: string }) {
  const query = new URLSearchParams();
  if (params?.startDate) query.append("start_date", params.startDate);
  if (params?.endDate) query.append("end_date", params.endDate);
  if (params?.departmentId) query.append("department_id", params.departmentId);

  const qs = query.toString();
  const url = `/api/v1/academic-calendar${qs ? `?${qs}` : ""}`;
  
  return apiFetch<ApiResponse<{ items: AcademicCalendarItem[] }>>(url, { token });
}

export type CreateCalendarEventPayload = {
  academic_year_id: string;
  department_id?: string;
  title: string;
  description?: string;
  event_type: CalendarEventType;
  start_date: string;
  end_date?: string;
  is_all_day?: boolean;
  target_roles?: string[];
};

export async function createCalendarEvent(token: string, payload: CreateCalendarEventPayload) {
  return apiFetch<ApiResponse<{ event: AcademicCalendarItem }>>("/api/v1/admin/academic-calendar", {
    method: "POST",
    token,
    body: payload,
  });
}

export type UpdateCalendarEventPayload = {
  title: string;
  description?: string;
  event_type: CalendarEventType;
  start_date: string;
  end_date?: string;
  is_all_day?: boolean;
  target_roles?: string[];
  is_active?: boolean;
};

export async function updateCalendarEvent(token: string, id: string, payload: UpdateCalendarEventPayload) {
  return apiFetch<ApiResponse<{ event: AcademicCalendarItem }>>(`/api/v1/admin/academic-calendar/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deleteCalendarEvent(token: string, id: string) {
  return apiFetch<ApiResponse<null>>(`/api/v1/admin/academic-calendar/${id}`, {
    method: "DELETE",
    token,
  });
}

