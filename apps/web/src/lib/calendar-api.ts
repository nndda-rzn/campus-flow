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
