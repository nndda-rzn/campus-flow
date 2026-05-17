import { apiFetch } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";

export type AcademicYear = {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RawRecord = Record<string, unknown>;

function getString(obj: RawRecord, camel: string, snake?: string) {
  const v = obj[camel] ?? (snake ? obj[snake] : undefined);
  return typeof v === "string" ? v : "";
}

function getBool(obj: RawRecord, camel: string, snake?: string) {
  const v = obj[camel] ?? (snake ? obj[snake] : undefined);
  return typeof v === "boolean" ? v : false;
}

function getArray(obj: RawRecord, camel: string, snake?: string) {
  const v = obj[camel] ?? (snake ? obj[snake] : undefined);
  return Array.isArray(v) ? v : [];
}

function normalizeYear(raw: RawRecord): AcademicYear {
  return {
    id: getString(raw, "id"),
    code: getString(raw, "code"),
    name: getString(raw, "name"),
    startDate: getString(raw, "startDate", "start_date"),
    endDate: getString(raw, "endDate", "end_date"),
    isActive: getBool(raw, "isActive", "is_active"),
    createdAt: getString(raw, "createdAt", "created_at"),
    updatedAt: getString(raw, "updatedAt", "updated_at"),
  };
}

export async function listAcademicYears(token: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/academic-years",
    { token },
  );
  const raw = getArray(response.data ?? {}, "items");
  return {
    ...response,
    data: { items: raw.map((y) => normalizeYear(y as RawRecord)) },
  };
}

export async function getActiveAcademicYear(token: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/academic-years/active",
    { token },
  );
  const raw = (response.data?.year ?? {}) as RawRecord;
  return { ...response, data: { year: normalizeYear(raw) } };
}

export async function createAcademicYear(
  token: string,
  payload: {
    code: string;
    name: string;
    start_date: string;
    end_date: string;
    is_active?: boolean;
  },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/academic-years/create",
    { method: "POST", token, body: payload },
  );
  const raw = (response.data?.year ?? {}) as RawRecord;
  return { ...response, data: { year: normalizeYear(raw) } };
}

export async function setActiveAcademicYear(token: string, id: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/academic-years/set-active",
    { method: "POST", token, body: { id } },
  );
  const raw = (response.data?.year ?? {}) as RawRecord;
  return { ...response, data: { year: normalizeYear(raw) } };
}

// ─── User Scope ──────────────────────────────────────────────────────────────

export type UserScopeItem = {
  userId: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
};

function normalizeScope(raw: RawRecord): UserScopeItem {
  return {
    userId: getString(raw, "userId", "user_id"),
    departmentId: getString(raw, "departmentId", "department_id"),
    departmentCode: getString(raw, "departmentCode", "department_code"),
    departmentName: getString(raw, "departmentName", "department_name"),
  };
}

export async function getUserScope(token: string, userId: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    `/api/v1/admin/users/scope?user_id=${encodeURIComponent(userId)}`,
    { token },
  );
  const raw = getArray(response.data ?? {}, "scopes");
  return {
    ...response,
    data: {
      scopes: raw.map((s) => normalizeScope(s as RawRecord)),
    },
  };
}

export async function setUserScope(
  token: string,
  payload: { user_id: string; department_ids: string[] },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/users/scope/set",
    { method: "POST", token, body: payload },
  );
  const raw = getArray(response.data ?? {}, "scopes");
  return {
    ...response,
    data: {
      scopes: raw.map((s) => normalizeScope(s as RawRecord)),
    },
  };
}
