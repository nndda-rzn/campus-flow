import { apiFetch } from "./api";
import type { ApiResponse } from "@/types/auth";

export type ThesisFinalDocument = {
  id: string;
  supervisorRequestId: string;
  studentUserId: string;
  lecturerUserId: string;
  documentType: string;
  title: string;
  fileId: string;
  filename: string;
  version: number;
  status: string;
  submittedAt: string;
  reviewedAt: string;
  approvedAt: string;
  lecturerNotes: string;
  rejectionReason: string;
  createdAt: string;
  updatedAt: string;
  studentName: string;
  studentNim: string;
  lecturerName: string;
  topicTitle: string;
};

export type ListFinalDocumentsResponse = {
  documents: ThesisFinalDocument[];
  totalCount: number;
  page: number;
  pageSize: number;
};

type RawRecord = Record<string, unknown>;

function getString(obj: RawRecord, camel: string, snake?: string): string {
  const v = obj[camel] ?? (snake ? obj[snake] : undefined);
  return typeof v === "string" ? v : "";
}

function getNumber(obj: RawRecord, camel: string, snake?: string): number {
  const v = obj[camel] ?? (snake ? obj[snake] : undefined);
  return typeof v === "number" ? v : 0;
}

function normalizeDocument(raw: RawRecord): ThesisFinalDocument {
  return {
    id: getString(raw, "id"),
    supervisorRequestId: getString(raw, "supervisorRequestId", "supervisor_request_id"),
    studentUserId: getString(raw, "studentUserId", "student_user_id"),
    lecturerUserId: getString(raw, "lecturerUserId", "lecturer_user_id"),
    documentType: getString(raw, "documentType", "document_type"),
    title: getString(raw, "title"),
    fileId: getString(raw, "fileId", "file_id"),
    filename: getString(raw, "filename"),
    version: getNumber(raw, "version"),
    status: getString(raw, "status"),
    submittedAt: getString(raw, "submittedAt", "submitted_at"),
    reviewedAt: getString(raw, "reviewedAt", "reviewed_at"),
    approvedAt: getString(raw, "approvedAt", "approved_at"),
    lecturerNotes: getString(raw, "lecturerNotes", "lecturer_notes"),
    rejectionReason: getString(raw, "rejectionReason", "rejection_reason"),
    createdAt: getString(raw, "createdAt", "created_at"),
    updatedAt: getString(raw, "updatedAt", "updated_at"),
    studentName: getString(raw, "studentName", "student_name"),
    studentNim: getString(raw, "studentNim", "student_nim"),
    lecturerName: getString(raw, "lecturerName", "lecturer_name"),
    topicTitle: getString(raw, "topicTitle", "topic_title"),
  };
}

export async function listLecturerFinalDocuments(
  token: string,
  options?: { statusFilter?: string; page?: number; pageSize?: number },
) {
  const params = new URLSearchParams();
  if (options?.statusFilter) params.set("status_filter", options.statusFilter);
  if (options?.page) params.set("page", String(options.page));
  if (options?.pageSize) params.set("page_size", String(options.pageSize));

  const query = params.toString();
  const url = `/api/v1/lecturer/final-documents${query ? `?${query}` : ""}`;

  const response = await apiFetch<ApiResponse<RawRecord>>(url, { token });
  const data = response.data ?? {};
  const rawDocs = Array.isArray(data.documents) ? data.documents : [];

  return {
    ...response,
    data: {
      documents: rawDocs.map((d) => normalizeDocument(d as RawRecord)),
      totalCount: getNumber(data, "totalCount", "total_count"),
      page: getNumber(data, "page"),
      pageSize: getNumber(data, "pageSize", "page_size"),
    } as ListFinalDocumentsResponse,
  };
}

export async function getFinalDocument(token: string, documentId: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    `/api/v1/lecturer/final-documents/${documentId}`,
    { token },
  );
  const raw = (response.data?.document ?? {}) as RawRecord;
  return { ...response, data: { document: normalizeDocument(raw) } };
}

async function actionRequest(
  token: string,
  endpoint: string,
  documentId: string,
  notes: string,
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(endpoint, {
    method: "POST",
    token,
    body: { document_id: documentId, notes },
  });
  const raw = (response.data?.document ?? {}) as RawRecord;
  return { ...response, data: { document: normalizeDocument(raw) } };
}

export async function startFinalDocumentReview(token: string, documentId: string) {
  return actionRequest(token, "/api/v1/lecturer/final-documents/start-review", documentId, "");
}

export async function approveFinalDocument(token: string, documentId: string, notes: string) {
  return actionRequest(token, "/api/v1/lecturer/final-documents/approve", documentId, notes);
}

export async function requestRevisionFinalDocument(token: string, documentId: string, notes: string) {
  return actionRequest(token, "/api/v1/lecturer/final-documents/request-revision", documentId, notes);
}

export async function rejectFinalDocument(token: string, documentId: string, reason: string) {
  return actionRequest(token, "/api/v1/lecturer/final-documents/reject", documentId, reason);
}
