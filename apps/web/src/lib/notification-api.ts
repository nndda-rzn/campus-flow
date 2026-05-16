import { apiFetch } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";

type RawRecord = Record<string, unknown>;

function getString(obj: RawRecord, camelKey: string, snakeKey?: string) {
  const value = obj[camelKey] ?? (snakeKey ? obj[snakeKey] : undefined);
  return typeof value === "string" ? value : "";
}

function getBoolean(obj: RawRecord, camelKey: string, snakeKey?: string) {
  const value = obj[camelKey] ?? (snakeKey ? obj[snakeKey] : undefined);
  return typeof value === "boolean" ? value : false;
}

function getArray(obj: RawRecord, camelKey: string, snakeKey?: string) {
  const value = obj[camelKey] ?? (snakeKey ? obj[snakeKey] : undefined);
  return Array.isArray(value) ? value : [];
}

export type NotificationItem = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  entityType: string;
  entityId: string;
  isRead: boolean;
  createdAt: string;
  readAt: string;
};

export type ListNotificationsData = {
  notifications: NotificationItem[];
};

export type NotificationResponseData = {
  notification: NotificationItem;
};

function normalizeNotification(raw: RawRecord): NotificationItem {
  return {
    id: getString(raw, "id"),
    userId: getString(raw, "userId", "user_id"),
    title: getString(raw, "title"),
    message: getString(raw, "message"),
    type: getString(raw, "type"),
    entityType: getString(raw, "entityType", "entity_type"),
    entityId: getString(raw, "entityId", "entity_id"),
    isRead: getBoolean(raw, "isRead", "is_read"),
    createdAt: getString(raw, "createdAt", "created_at"),
    readAt: getString(raw, "readAt", "read_at"),
  };
}

export async function listMyNotifications(token: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/notifications",
    {
      token,
    },
  );

  const rawNotifications = getArray(response.data ?? {}, "notifications");

  return {
    ...response,
    data: {
      notifications: rawNotifications.map((item) =>
        normalizeNotification(item as RawRecord),
      ),
    },
  };
}

export async function markNotificationAsRead(
  token: string,
  payload: {
    notification_id: string;
  },
) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/notifications/read",
    {
      method: "POST",
      token,
      body: payload,
    },
  );

  const rawNotification = (response.data?.notification ?? {}) as RawRecord;

  return {
    ...response,
    data: {
      notification: normalizeNotification(rawNotification),
    },
  };
}

export async function markAllNotificationsAsRead(token: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    "/api/v1/notifications/read-all",
    {
      method: "POST",
      token,
    },
  );

  const updatedCount =
    typeof response.data?.updatedCount === "number"
      ? response.data.updatedCount
      : typeof response.data?.updated_count === "number"
        ? response.data.updated_count
        : 0;

  return {
    ...response,
    data: { updatedCount },
  };
}
