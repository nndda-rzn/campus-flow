import { apiFetch } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Department = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
};

export type DirectoryStudent = {
  id: string;
  userId: string;
  nim: string;
  fullName: string;
  email: string;
  departmentId: string;
  departmentName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type DirectoryLecturer = {
  id: string;
  userId: string;
  nidn: string;
  fullName: string;
  email: string;
  departmentId: string;
  departmentName: string;
  status: string;
  maxSupervisorQuota: number;
  createdAt: string;
  updatedAt: string;
};

// ─── Normalizers ─────────────────────────────────────────────────────────────

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

function normalizeUser(raw: RawRecord): AdminUser {
  return {
    id: getString(raw, "id"),
    fullName: getString(raw, "fullName", "full_name"),
    email: getString(raw, "email"),
    role: getString(raw, "role"),
    status: getString(raw, "status"),
    createdAt: getString(raw, "createdAt", "created_at"),
    updatedAt: getString(raw, "updatedAt", "updated_at"),
  };
}

function normalizeDepartment(raw: RawRecord): Department {
  return {
    id: getString(raw, "id"),
    code: getString(raw, "code"),
    name: getString(raw, "name"),
    createdAt: getString(raw, "createdAt", "created_at"),
  };
}

function normalizeStudent(raw: RawRecord): DirectoryStudent {
  return {
    id: getString(raw, "id"),
    userId: getString(raw, "userId", "user_id"),
    nim: getString(raw, "nim"),
    fullName: getString(raw, "fullName", "full_name"),
    email: getString(raw, "email"),
    departmentId: getString(raw, "departmentId", "department_id"),
    departmentName: getString(raw, "departmentName", "department_name"),
    status: getString(raw, "status"),
    createdAt: getString(raw, "createdAt", "created_at"),
    updatedAt: getString(raw, "updatedAt", "updated_at"),
  };
}

function normalizeLecturer(raw: RawRecord): DirectoryLecturer {
  return {
    id: getString(raw, "id"),
    userId: getString(raw, "userId", "user_id"),
    nidn: getString(raw, "nidn"),
    fullName: getString(raw, "fullName", "full_name"),
    email: getString(raw, "email"),
    departmentId: getString(raw, "departmentId", "department_id"),
    departmentName: getString(raw, "departmentName", "department_name"),
    status: getString(raw, "status"),
    maxSupervisorQuota: getNumber(
      raw,
      "maxSupervisorQuota",
      "max_supervisor_quota",
    ),
    createdAt: getString(raw, "createdAt", "created_at"),
    updatedAt: getString(raw, "updatedAt", "updated_at"),
  };
}

// ─── API: Users ──────────────────────────────────────────────────────────────

export async function listUsers(
  token: string,
  filters?: { role?: string; status?: string; search?: string },
) {
  const params = new URLSearchParams();
  if (filters?.role) params.set("role", filters.role);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await apiFetch<ApiResponse<RawRecord>>(
    `/api/v1/admin/users${query}`,
    { token },
  );

  const rawUsers = getArray(response.data ?? {}, "users");

  return {
    ...response,
    data: { users: rawUsers.map((u) => normalizeUser(u as RawRecord)) },
  };
}

export async function updateUser(
  token: string,
  payload: { user_id: string; full_name?: string; email?: string },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/users/update",
    { method: "POST", token, body: payload },
  );
  const rawUser = (response.data?.user ?? {}) as RawRecord;
  return { ...response, data: { user: normalizeUser(rawUser) } };
}

export async function setUserStatus(
  token: string,
  payload: { user_id: string; status: string },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/users/status",
    { method: "POST", token, body: payload },
  );
  const rawUser = (response.data?.user ?? {}) as RawRecord;
  return { ...response, data: { user: normalizeUser(rawUser) } };
}

export async function assignUserRole(
  token: string,
  payload: { user_id: string; role: string },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/users/role",
    { method: "POST", token, body: payload },
  );
  const rawUser = (response.data?.user ?? {}) as RawRecord;
  return { ...response, data: { user: normalizeUser(rawUser) } };
}

// ─── API: Departments ────────────────────────────────────────────────────────

export async function listDepartments(token: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/departments",
    { token },
  );
  const raw = getArray(response.data ?? {}, "departments");
  return {
    ...response,
    data: { departments: raw.map((d) => normalizeDepartment(d as RawRecord)) },
  };
}

export async function createDepartment(
  token: string,
  payload: { code: string; name: string },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/departments/create",
    { method: "POST", token, body: payload },
  );
  const raw = (response.data?.department ?? {}) as RawRecord;
  return { ...response, data: { department: normalizeDepartment(raw) } };
}

export async function updateDepartment(
  token: string,
  payload: { id: string; code?: string; name?: string },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/departments/update",
    { method: "POST", token, body: payload },
  );
  const raw = (response.data?.department ?? {}) as RawRecord;
  return { ...response, data: { department: normalizeDepartment(raw) } };
}

// ─── API: Students ───────────────────────────────────────────────────────────

export async function listStudents(
  token: string,
  filters?: { status?: string; search?: string },
) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await apiFetch<ApiResponse<RawRecord>>(
    `/api/v1/admin/students${query}`,
    { token },
  );
  const raw = getArray(response.data ?? {}, "students");
  return {
    ...response,
    data: { students: raw.map((s) => normalizeStudent(s as RawRecord)) },
  };
}

export async function upsertStudent(
  token: string,
  payload: {
    user_id: string;
    nim?: string;
    full_name: string;
    email: string;
    department_id?: string;
  },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/students/upsert",
    { method: "POST", token, body: payload },
  );
  const raw = (response.data?.student ?? {}) as RawRecord;
  return { ...response, data: { student: normalizeStudent(raw) } };
}

export async function setStudentStatus(
  token: string,
  payload: { user_id: string; status: string },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/students/status",
    { method: "POST", token, body: payload },
  );
  const raw = (response.data?.student ?? {}) as RawRecord;
  return { ...response, data: { student: normalizeStudent(raw) } };
}

// ─── API: Lecturers ──────────────────────────────────────────────────────────

export async function listAllLecturers(
  token: string,
  filters?: { status?: string; search?: string },
) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await apiFetch<ApiResponse<RawRecord>>(
    `/api/v1/admin/lecturers${query}`,
    { token },
  );
  const raw = getArray(response.data ?? {}, "lecturers");
  return {
    ...response,
    data: { lecturers: raw.map((l) => normalizeLecturer(l as RawRecord)) },
  };
}

export async function upsertLecturer(
  token: string,
  payload: {
    user_id: string;
    nidn?: string;
    full_name: string;
    email: string;
    department_id?: string;
    max_supervisor_quota?: number;
  },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/lecturers/upsert",
    { method: "POST", token, body: payload },
  );
  const raw = (response.data?.lecturer ?? {}) as RawRecord;
  return { ...response, data: { lecturer: normalizeLecturer(raw) } };
}

export async function setLecturerStatus(
  token: string,
  payload: { user_id: string; status: string },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/lecturers/status",
    { method: "POST", token, body: payload },
  );
  const raw = (response.data?.lecturer ?? {}) as RawRecord;
  return { ...response, data: { lecturer: normalizeLecturer(raw) } };
}
