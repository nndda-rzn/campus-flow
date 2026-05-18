import { apiFetch } from "./api";
import type { ApiResponse } from "@/types/auth";

export type GuidanceLogStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REVISION_REQUIRED";

export type GuidanceLogAttachment = {
  fileId: string;
  filename: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
};

export type GuidanceLogItem = {
  id: string;
  studentUserId: string;
  supervisorRequestId: string;
  lecturerUserId: string;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  topic: string;
  discussionSummary: string;
  nextAction: string;
  status: GuidanceLogStatus;
  submittedAt?: string;
  supervisorFeedback: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  studentName: string;
  lecturerName: string;
  // Enhanced fields
  lecturerNotes?: string;
  milestoneId?: string;
  milestoneName?: string;
  milestoneCode?: string;
  attachments?: GuidanceLogAttachment[];
};

export async function getStudentGuidanceLogs(token: string) {
  return apiFetch<ApiResponse<{ items: GuidanceLogItem[] }>>("/api/v1/student/guidance-logs", { token });
}

export async function getLecturerGuidanceLogs(token: string) {
  return apiFetch<ApiResponse<{ items: GuidanceLogItem[] }>>("/api/v1/lecturer/guidance-logs", { token });
}

export async function getStudentGuidanceLogById(token: string, id: string) {
  return apiFetch<ApiResponse<GuidanceLogItem>>(`/api/v1/student/guidance-logs/${id}`, { token });
}

export type CreateGuidanceLogPayload = {
  supervisor_request_id: string;
  lecturer_user_id: string;
  session_date: string;
  start_time?: string;
  end_time?: string;
  topic: string;
  discussion_summary: string;
  next_action?: string;
};

export async function createGuidanceLog(token: string, payload: CreateGuidanceLogPayload) {
  return apiFetch<ApiResponse<GuidanceLogItem>>("/api/v1/student/guidance-logs", {
    method: "POST",
    token,
    body: payload,
  });
}

export type UpdateGuidanceLogPayload = {
  session_date: string;
  start_time?: string;
  end_time?: string;
  topic: string;
  discussion_summary: string;
  next_action?: string;
};

export async function updateGuidanceLog(token: string, id: string, payload: UpdateGuidanceLogPayload) {
  return apiFetch<ApiResponse<GuidanceLogItem>>(`/api/v1/student/guidance-logs/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function submitGuidanceLog(token: string, id: string) {
  return apiFetch<ApiResponse<GuidanceLogItem>>(`/api/v1/student/guidance-logs/${id}/submit`, {
    method: "POST",
    token,
  });
}

export async function deleteGuidanceLog(token: string, id: string) {
  return apiFetch<ApiResponse<null>>(`/api/v1/student/guidance-logs/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function approveGuidanceLog(token: string, id: string, feedback?: string) {
  return apiFetch<ApiResponse<GuidanceLogItem>>(`/api/v1/lecturer/guidance-logs/${id}/approve`, {
    method: "POST",
    token,
    body: { feedback },
  });
}

export async function requestRevisionGuidanceLog(token: string, id: string, feedback: string) {
  return apiFetch<ApiResponse<GuidanceLogItem>>(`/api/v1/lecturer/guidance-logs/${id}/request-revision`, {
    method: "POST",
    token,
    body: { feedback },
  });
}

// ─── Enhanced Guidance Log API ──────────────────────────────────────────────

export async function updateGuidanceLogNotes(token: string, id: string, payload: { lecturer_notes: string; milestone_id?: string }) {
  return apiFetch<ApiResponse<GuidanceLogItem>>(`/api/v1/lecturer/guidance-logs/${id}/notes`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function attachFileToGuidanceLog(token: string, id: string, payload: { file_id: string; filename: string }) {
  return apiFetch<ApiResponse<GuidanceLogItem>>(`/api/v1/lecturer/guidance-logs/${id}/attachments`, {
    method: "POST",
    token,
    body: payload,
  });
}

export async function removeAttachmentFromGuidanceLog(token: string, id: string, fileId: string) {
  return apiFetch<ApiResponse<GuidanceLogItem>>(`/api/v1/lecturer/guidance-logs/${id}/attachments/${fileId}`, {
    method: "DELETE",
    token,
  });
}
