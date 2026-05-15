import { apiFetch } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";

export type StatusCount = {
  status: string;
  total: number;
};

export type AcademicDashboard = {
  totalRequests: number;
  submittedRequests: number;
  verifiedRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  completedRequests: number;
  statusCounts: StatusCount[];
};

export type SupervisorDashboard = {
  totalRequests: number;
  submittedRequests: number;
  verifiedRequests: number;
  assignedRequests: number;
  acceptedRequests: number;
  rejectedRequests: number;
  completedRequests: number;
  statusCounts: StatusCount[];
};

export async function getAcademicReport(token: string) {
  return apiFetch<ApiResponse<AcademicDashboard>>(
    "/api/v1/reports/academic-requests",
    {
      token,
    },
  );
}

export async function getSupervisorReport(token: string) {
  return apiFetch<ApiResponse<SupervisorDashboard>>(
    "/api/v1/reports/supervisor-requests",
    {
      token,
    },
  );
}
