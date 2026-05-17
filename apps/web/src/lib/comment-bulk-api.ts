import { apiFetch } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";

export type RequestComment = {
  id: string;
  requestId: string;
  requestType: "ACADEMIC" | "SUPERVISOR";
  authorUserId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
};

type RawRecord = Record<string, unknown>;

function getString(obj: RawRecord, camel: string, snake?: string) {
  const v = obj[camel] ?? (snake ? obj[snake] : undefined);
  return typeof v === "string" ? v : "";
}

function getArray(obj: RawRecord, camel: string, snake?: string) {
  const v = obj[camel] ?? (snake ? obj[snake] : undefined);
  return Array.isArray(v) ? v : [];
}

function normalize(raw: RawRecord): RequestComment {
  return {
    id: getString(raw, "id"),
    requestId: getString(raw, "requestId", "request_id"),
    requestType: (getString(raw, "requestType", "request_type") || "ACADEMIC") as
      | "ACADEMIC"
      | "SUPERVISOR",
    authorUserId: getString(raw, "authorUserId", "author_user_id"),
    authorName: getString(raw, "authorName", "author_name"),
    authorRole: getString(raw, "authorRole", "author_role"),
    body: getString(raw, "body"),
    createdAt: getString(raw, "createdAt", "created_at"),
  };
}

export async function listRequestComments(
  token: string,
  requestType: "ACADEMIC" | "SUPERVISOR",
  requestID: string,
) {
  const params = new URLSearchParams();
  params.set("request_type", requestType);
  params.set("request_id", requestID);
  const response = await apiFetch<ApiResponse<RawRecord>>(
    `/api/v1/request-comments?${params.toString()}`,
    { token },
  );
  const raw = getArray(response.data ?? {}, "items");
  return {
    ...response,
    data: { items: raw.map((it) => normalize(it as RawRecord)) },
  };
}

export async function createRequestComment(
  token: string,
  payload: {
    request_type: "ACADEMIC" | "SUPERVISOR";
    request_id: string;
    body: string;
  },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/request-comments/create",
    { method: "POST", token, body: payload },
  );
  const raw = (response.data?.comment ?? {}) as RawRecord;
  return { ...response, data: { comment: normalize(raw) } };
}

// ─── Bulk verify (FR-255) ────────────────────────────────────────────────────

export type BulkVerifyResult = {
  request_id: string;
  success: boolean;
  error: string;
};

export async function bulkVerifyAcademicRequests(
  token: string,
  payload: { request_ids: string[]; note?: string },
) {
  return apiFetch<
    ApiResponse<{
      results?: BulkVerifyResult[];
      succeeded?: number;
      failed?: number;
    }>
  >("/api/v1/admin/academic-requests/bulk-verify", {
    method: "POST",
    token,
    body: payload,
  });
}
