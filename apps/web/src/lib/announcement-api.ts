import { apiFetch } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";

export type AnnouncementSeverity = "INFO" | "WARNING" | "CRITICAL" | "SUCCESS";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  authorUserId: string;
  authorName: string;
  targetRoles: string[];
  isActive: boolean;
  startsAt: string;
  endsAt: string;
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

function normalize(raw: RawRecord): Announcement {
  return {
    id: getString(raw, "id"),
    title: getString(raw, "title"),
    body: getString(raw, "body"),
    severity: (getString(raw, "severity") || "INFO") as AnnouncementSeverity,
    authorUserId: getString(raw, "authorUserId", "author_user_id"),
    authorName: getString(raw, "authorName", "author_name"),
    targetRoles: getArray(raw, "targetRoles", "target_roles").map((v) =>
      typeof v === "string" ? v : "",
    ),
    isActive: getBool(raw, "isActive", "is_active"),
    startsAt: getString(raw, "startsAt", "starts_at"),
    endsAt: getString(raw, "endsAt", "ends_at"),
    createdAt: getString(raw, "createdAt", "created_at"),
    updatedAt: getString(raw, "updatedAt", "updated_at"),
  };
}

export async function listAnnouncements(
  token: string,
  opts?: { includeInactive?: boolean },
) {
  const query = opts?.includeInactive ? "?include_inactive=true" : "";
  const response = await apiFetch<ApiResponse<RawRecord>>(
    `/api/v1/announcements${query}`,
    { token },
  );
  const raw = getArray(response.data ?? {}, "items");
  return {
    ...response,
    data: { items: raw.map((it) => normalize(it as RawRecord)) },
  };
}

export async function createAnnouncement(
  token: string,
  payload: {
    title: string;
    body: string;
    severity?: AnnouncementSeverity;
    target_roles?: string[];
    starts_at?: string;
    ends_at?: string;
  },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/announcements/create",
    { method: "POST", token, body: payload },
  );
  const raw = (response.data?.announcement ?? {}) as RawRecord;
  return { ...response, data: { announcement: normalize(raw) } };
}

export async function updateAnnouncement(
  token: string,
  payload: {
    id: string;
    title?: string;
    body?: string;
    severity?: AnnouncementSeverity;
    target_roles?: string[];
    ends_at?: string;
  },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/announcements/update",
    { method: "POST", token, body: payload },
  );
  const raw = (response.data?.announcement ?? {}) as RawRecord;
  return { ...response, data: { announcement: normalize(raw) } };
}

export async function deactivateAnnouncement(token: string, id: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/admin/announcements/deactivate",
    { method: "POST", token, body: { id } },
  );
  const raw = (response.data?.announcement ?? {}) as RawRecord;
  return { ...response, data: { announcement: normalize(raw) } };
}
