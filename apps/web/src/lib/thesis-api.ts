import { apiFetch } from "./api";
import type { ApiResponse } from "@/types/auth";

export type ThesisMilestoneItem = {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  description: string;
  sequenceOrder: number;
  isActive: boolean;
};

export type ThesisProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export type ThesisProgressItem = {
  id: string;
  studentUserId: string;
  supervisorRequestId: string;
  milestoneId: string;
  status: ThesisProgressStatus;
  targetDate?: string;
  completedAt?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  milestoneName: string;
  milestoneCode: string;
  sequenceOrder: number;
};

export async function getThesisMilestones(token: string, departmentId: string) {
  return apiFetch<ApiResponse<{ items: ThesisMilestoneItem[] }>>(`/api/v1/thesis-milestones?department_id=${departmentId}`, { token });
}

export async function getStudentThesisProgress(token: string) {
  return apiFetch<ApiResponse<{ items: ThesisProgressItem[] }>>("/api/v1/student/thesis-progress", { token });
}

export async function updateThesisProgress(
  token: string, 
  id: string, 
  payload: { notes: string; target_date?: string; status: ThesisProgressStatus }
) {
  return apiFetch<ApiResponse<{ progress: ThesisProgressItem }>>(`/api/v1/student/thesis-progress/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export type CreateMilestonePayload = {
  department_id: string;
  code: string;
  name: string;
  description?: string;
  sequence_order: number;
};

export async function createThesisMilestone(token: string, payload: CreateMilestonePayload) {
  return apiFetch<ApiResponse<{ milestone: ThesisMilestoneItem }>>("/api/v1/admin/thesis-milestones", {
    method: "POST",
    token,
    body: payload,
  });
}

export type UpdateMilestonePayload = {
  name: string;
  description?: string;
  sequence_order: number;
  is_active?: boolean;
};

export async function updateThesisMilestone(token: string, id: string, payload: UpdateMilestonePayload) {
  return apiFetch<ApiResponse<{ milestone: ThesisMilestoneItem }>>(`/api/v1/admin/thesis-milestones/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deleteThesisMilestone(token: string, id: string) {
  return apiFetch<ApiResponse<null>>(`/api/v1/admin/thesis-milestones/${id}`, {
    method: "DELETE",
    token,
  });
}

// ─── Lecturer Progress Tracking ─────────────────────────────────────────────

export type SupervisedStudentProgress = {
  studentUserId: string;
  studentName: string;
  studentNim: string;
  topicTitle: string;
  supervisorRequestId: string;
  totalMilestones: number;
  completedMilestones: number;
  lastActivityAt?: string;
  daysSinceLastActivity: number;
  progress?: ThesisProgressItem[];
};

export async function listSupervisedProgress(
  token: string,
  options?: { includeCompleted?: boolean; stuckThresholdDays?: number }
) {
  const params = new URLSearchParams();
  if (options?.includeCompleted) {
    params.set("include_completed", "true");
  }
  if (options?.stuckThresholdDays) {
    params.set("stuck_threshold_days", String(options.stuckThresholdDays));
  }
  const query = params.toString();
  const url = `/api/v1/lecturer/supervised-students/progress${query ? `?${query}` : ""}`;
  return apiFetch<ApiResponse<{ items: SupervisedStudentProgress[] }>>(url, { token });
}

export async function getStudentProgressDetail(token: string, studentUserId: string) {
  return apiFetch<ApiResponse<SupervisedStudentProgress>>(
    `/api/v1/lecturer/supervised-students/${studentUserId}/progress`,
    { token }
  );
}

export async function completeMilestone(token: string, progressId: string, notes?: string) {
  return apiFetch<ApiResponse<{ progress: ThesisProgressItem }>>(
    `/api/v1/lecturer/thesis-progress/${progressId}/complete`,
    {
      method: "POST",
      token,
      body: { notes: notes ?? "" },
    }
  );
}
