import { apiFetch } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";

export type AcademicServiceItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
};

export type AcademicRequest = {
  id: string;
  requestNumber: string;
  studentUserId: string;
  academicServiceId: string;
  serviceCode: string;
  serviceName: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ListAcademicServicesData = {
  services: AcademicServiceItem[];
};

export type AcademicRequestResponseData = {
  request: AcademicRequest;
};

export type ListAcademicRequestsData = {
  requests: AcademicRequest[];
};

export async function listAcademicServices(token: string) {
  return apiFetch<ApiResponse<ListAcademicServicesData>>(
    "/api/v1/academic-services",
    {
      token,
    },
  );
}

export async function listMyAcademicRequests(token: string) {
  return apiFetch<ApiResponse<ListAcademicRequestsData>>(
    "/api/v1/student/academic-requests",
    {
      token,
    },
  );
}

export async function createAcademicRequest(
  token: string,
  payload: {
    service_code: string;
    title: string;
    description: string;
  },
) {
  return apiFetch<ApiResponse<AcademicRequestResponseData>>(
    "/api/v1/student/academic-requests",
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

// ─── Student: cancel pengajuan ───────────────────────────────────────────────

export async function cancelAcademicRequest(
  token: string,
  payload: { request_id: string; note?: string },
) {
  return apiFetch<ApiResponse<AcademicRequestResponseData>>(
    "/api/v1/student/academic-requests/cancel",
    { method: "POST", token, body: payload },
  );
}

// ─── Admin / Staff workflow actions ──────────────────────────────────────────

export type WorkflowPayload = {
  request_id: string;
  note?: string;
};

export async function verifyAcademicRequest(
  token: string,
  payload: WorkflowPayload,
) {
  return apiFetch<ApiResponse<AcademicRequestResponseData>>(
    "/api/v1/admin/academic-requests/verify",
    { method: "POST", token, body: payload },
  );
}

export async function approveAcademicRequest(
  token: string,
  payload: WorkflowPayload,
) {
  return apiFetch<ApiResponse<AcademicRequestResponseData>>(
    "/api/v1/head/academic-requests/approve",
    { method: "POST", token, body: payload },
  );
}

export async function rejectAcademicRequest(
  token: string,
  payload: WorkflowPayload,
) {
  return apiFetch<ApiResponse<AcademicRequestResponseData>>(
    "/api/v1/head/academic-requests/reject",
    { method: "POST", token, body: payload },
  );
}

export async function completeAcademicRequest(
  token: string,
  payload: WorkflowPayload,
) {
  return apiFetch<ApiResponse<AcademicRequestResponseData>>(
    "/api/v1/staff/academic-requests/complete",
    { method: "POST", token, body: payload },
  );
}

export async function requestRevisionAcademicRequest(
  token: string,
  payload: WorkflowPayload,
) {
  return apiFetch<ApiResponse<AcademicRequestResponseData>>(
    "/api/v1/admin/academic-requests/request-revision",
    { method: "POST", token, body: payload },
  );
}

export async function submitAcademicRequest(
  token: string,
  payload: WorkflowPayload,
) {
  return apiFetch<ApiResponse<AcademicRequestResponseData>>(
    "/api/v1/student/academic-requests/submit",
    { method: "POST", token, body: payload },
  );
}

export async function updateAcademicRequest(
  token: string,
  payload: { request_id: string; title: string; description: string },
) {
  return apiFetch<ApiResponse<AcademicRequestResponseData>>(
    "/api/v1/student/academic-requests/update",
    { method: "POST", token, body: payload },
  );
}

// ─── Admin: list semua pengajuan (pakai endpoint yang sama, filter di FE) ────

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type ListAllAcademicRequestsData = {
  requests: AcademicRequest[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

/**
 * List semua academic request (untuk Admin, Kaprodi, Tata Usaha, Super Admin).
 * Opsional filter berdasarkan status dan pagination.
 */
export async function listAllAcademicRequests(
  token: string,
  statusFilter?: string,
  page?: number,
  limit?: number,
) {
  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<ApiResponse<ListAllAcademicRequestsData>>(
    `/api/v1/admin/academic-requests${query}`,
    { token },
  );
}
