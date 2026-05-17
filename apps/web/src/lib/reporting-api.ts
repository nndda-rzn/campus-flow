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

export type LecturerWorkloadItem = {
  lecturerId: string;
  lecturerUserId: string;
  lecturerName: string;
  activeCount: number;
  assignedCount: number;
  acceptedCount: number;
  completedCount: number;
  rejectedCount: number;
};

export type LecturerWorkloadData = {
  items: LecturerWorkloadItem[];
};

type DashboardFilter = {
  start_date?: string;
  end_date?: string;
};

function buildQuery(filter?: DashboardFilter) {
  if (!filter) return "";
  const params = new URLSearchParams();
  if (filter.start_date) params.set("start_date", filter.start_date);
  if (filter.end_date) params.set("end_date", filter.end_date);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function getAcademicReport(
  token: string,
  filter?: DashboardFilter,
) {
  return apiFetch<ApiResponse<AcademicDashboard>>(
    `/api/v1/reports/academic-requests${buildQuery(filter)}`,
    {
      token,
    },
  );
}

export async function getSupervisorReport(
  token: string,
  filter?: DashboardFilter,
) {
  return apiFetch<ApiResponse<SupervisorDashboard>>(
    `/api/v1/reports/supervisor-requests${buildQuery(filter)}`,
    {
      token,
    },
  );
}

type RawRecord = Record<string, unknown>;

function getString(obj: RawRecord, camel: string, snake?: string) {
  const v = obj[camel] ?? (snake ? obj[snake] : undefined);
  return typeof v === "string" ? v : "";
}

function getNumber(obj: RawRecord, camel: string, snake?: string) {
  const v = obj[camel] ?? (snake ? obj[snake] : undefined);
  return typeof v === "number" ? v : 0;
}

function getArray(obj: RawRecord, camel: string, snake?: string) {
  const v = obj[camel] ?? (snake ? obj[snake] : undefined);
  return Array.isArray(v) ? v : [];
}

function normalizeWorkload(raw: RawRecord): LecturerWorkloadItem {
  return {
    lecturerId: getString(raw, "lecturerId", "lecturer_id"),
    lecturerUserId: getString(raw, "lecturerUserId", "lecturer_user_id"),
    lecturerName: getString(raw, "lecturerName", "lecturer_name"),
    activeCount: getNumber(raw, "activeCount", "active_count"),
    assignedCount: getNumber(raw, "assignedCount", "assigned_count"),
    acceptedCount: getNumber(raw, "acceptedCount", "accepted_count"),
    completedCount: getNumber(raw, "completedCount", "completed_count"),
    rejectedCount: getNumber(raw, "rejectedCount", "rejected_count"),
  };
}

export async function getLecturerWorkload(token: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/reports/lecturer-workload",
    { token },
  );
  const raw = getArray(response.data ?? {}, "items");
  return {
    ...response,
    data: {
      items: raw.map((item) => normalizeWorkload(item as RawRecord)),
    } as LecturerWorkloadData,
  };
}
