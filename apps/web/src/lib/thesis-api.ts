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
  return apiFetch<ApiResponse<ThesisProgressItem>>(`/api/v1/student/thesis-progress/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
}
