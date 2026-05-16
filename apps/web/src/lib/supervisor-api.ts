import { apiFetch } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";

type RawRecord = Record<string, unknown>;

function getString(obj: RawRecord, camelKey: string, snakeKey?: string) {
  const value = obj[camelKey] ?? (snakeKey ? obj[snakeKey] : undefined);
  return typeof value === "string" ? value : "";
}

function getNumber(obj: RawRecord, camelKey: string, snakeKey?: string) {
  const value = obj[camelKey] ?? (snakeKey ? obj[snakeKey] : undefined);
  return typeof value === "number" ? value : 0;
}

function getArray(obj: RawRecord, camelKey: string, snakeKey?: string) {
  const value = obj[camelKey] ?? (snakeKey ? obj[snakeKey] : undefined);
  return Array.isArray(value) ? value : [];
}

export type Lecturer = {
  id: string;
  userId: string;
  nidn: string;
  fullName: string;
  email: string;
  status: string;
  maxSupervisorQuota: number;
};

export type SupervisorChoice = {
  lecturerId: string;
  lecturerName: string;
  priority: number;
};

export type SupervisorRequest = {
  id: string;
  requestNumber: string;
  studentUserId: string;
  topicTitle: string;
  topicDescription: string;
  status: string;
  assignedLecturerId: string;
  assignedLecturerName: string;
  choices: SupervisorChoice[];
  createdAt: string;
  updatedAt: string;
};

function normalizeLecturer(raw: RawRecord): Lecturer {
  return {
    id: getString(raw, "id"),
    userId: getString(raw, "userId", "user_id"),
    nidn: getString(raw, "nidn"),
    fullName: getString(raw, "fullName", "full_name"),
    email: getString(raw, "email"),
    status: getString(raw, "status"),
    maxSupervisorQuota: getNumber(
      raw,
      "maxSupervisorQuota",
      "max_supervisor_quota",
    ),
  };
}

function normalizeChoice(raw: RawRecord): SupervisorChoice {
  return {
    lecturerId: getString(raw, "lecturerId", "lecturer_id"),
    lecturerName: getString(raw, "lecturerName", "lecturer_name"),
    priority: getNumber(raw, "priority"),
  };
}

function normalizeSupervisorRequest(raw: RawRecord): SupervisorRequest {
  return {
    id: getString(raw, "id"),
    requestNumber: getString(raw, "requestNumber", "request_number"),
    studentUserId: getString(raw, "studentUserId", "student_user_id"),
    topicTitle: getString(raw, "topicTitle", "topic_title"),
    topicDescription: getString(raw, "topicDescription", "topic_description"),
    status: getString(raw, "status"),
    assignedLecturerId: getString(
      raw,
      "assignedLecturerId",
      "assigned_lecturer_id",
    ),
    assignedLecturerName: getString(
      raw,
      "assignedLecturerName",
      "assigned_lecturer_name",
    ),
    choices: getArray(raw, "choices").map((item) =>
      normalizeChoice(item as RawRecord),
    ),
    createdAt: getString(raw, "createdAt", "created_at"),
    updatedAt: getString(raw, "updatedAt", "updated_at"),
  };
}

function normalizeListResponse(response: ApiResponse<RawRecord>) {
  const rawRequests = getArray(response.data ?? {}, "requests");

  return {
    ...response,
    data: {
      requests: rawRequests.map((item) =>
        normalizeSupervisorRequest(item as RawRecord),
      ),
    },
  };
}

function normalizeSingleResponse(response: ApiResponse<RawRecord>) {
  const rawRequest = (response.data?.request ?? {}) as RawRecord;

  return {
    ...response,
    data: {
      request: normalizeSupervisorRequest(rawRequest),
    },
  };
}

export async function listLecturers(token: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>("/api/v1/lecturers", {
    token,
  });

  const rawLecturers = getArray(response.data ?? {}, "lecturers");

  return {
    ...response,
    data: {
      lecturers: rawLecturers.map((item) =>
        normalizeLecturer(item as RawRecord),
      ),
    },
  };
}

export async function listMySupervisorRequests(token: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/student/supervisor-requests",
    {
      token,
    },
  );

  return normalizeListResponse(response);
}

export async function createSupervisorRequest(
  token: string,
  payload: {
    topic_title: string;
    topic_description: string;
    lecturer_ids: string[];
  },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/student/supervisor-requests",
    {
      method: "POST",
      token,
      body: payload,
    },
  );

  return normalizeSingleResponse(response);
}

export async function verifySupervisorRequest(
  token: string,
  payload: {
    request_id: string;
    note: string;
  },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/supervisor-requests/verify",
    {
      method: "POST",
      token,
      body: payload,
    },
  );

  return normalizeSingleResponse(response);
}

export async function assignSupervisor(
  token: string,
  payload: {
    request_id: string;
    lecturer_id: string;
    note: string;
  },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/head/supervisor-requests/assign",
    {
      method: "POST",
      token,
      body: payload,
    },
  );

  return normalizeSingleResponse(response);
}

export async function listLecturerSupervisorRequests(token: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/lecturer/supervisor-requests",
    {
      token,
    },
  );

  return normalizeListResponse(response);
}

export async function acceptSupervisorRequest(
  token: string,
  payload: {
    request_id: string;
    note: string;
  },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/lecturer/supervisor-requests/accept",
    {
      method: "POST",
      token,
      body: payload,
    },
  );

  return normalizeSingleResponse(response);
}

export async function rejectSupervisorRequest(
  token: string,
  payload: {
    request_id: string;
    note: string;
  },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/lecturer/supervisor-requests/reject",
    {
      method: "POST",
      token,
      body: payload,
    },
  );

  return normalizeSingleResponse(response);
}

export async function listAllSupervisorRequests(
  token: string,
  statusFilter?: string,
) {
  const query = statusFilter
    ? `?status=${encodeURIComponent(statusFilter)}`
    : "";
  const response = await apiFetch<ApiResponse<RawRecord>>(
    `/api/v1/admin/supervisor-requests${query}`,
    { token },
  );

  return normalizeListResponse(response);
}
