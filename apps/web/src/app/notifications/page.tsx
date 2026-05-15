/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getAccessToken } from "@/lib/auth-storage";
import {
  NotificationItem,
  listMyNotifications,
  markNotificationAsRead,
} from "@/lib/notification-api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadNotifications() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await listMyNotifications(token);
      setNotifications(response.data.notifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat notifikasi");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    if (filter === "UNREAD")
      return notifications.filter((item) => !item.isRead);
    if (filter === "READ") return notifications.filter((item) => item.isRead);
    return notifications;
  }, [filter, notifications]);

  async function handleMarkAsRead(notificationId: string) {
    const token = getAccessToken();
    if (!token) return;

    setMessage("");
    setError("");

    try {
      await markNotificationAsRead(token, { notification_id: notificationId });
      await loadNotifications();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menandai notifikasi sebagai dibaca",
      );
    }
  }

  async function handleMarkAllAsRead() {
    const token = getAccessToken();
    if (!token) return;

    const unread = notifications.filter((item) => !item.isRead);
    setMessage("");
    setError("");

    try {
      await Promise.all(
        unread.map((item) =>
          markNotificationAsRead(token, { notification_id: item.id }),
        ),
      );
      setMessage("Semua notifikasi berhasil ditandai sebagai dibaca.");
      await loadNotifications();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menandai semua notifikasi",
      );
    }
  }

  return (
    <ProtectedPage
      title="Notifikasi"
      description="Pemberitahuan dari workflow akademik dan pengajuan dosen pembimbing."
    >
      {/* Summary cards */}
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Metric label="Total" value={notifications.length} accent="primary" />
        <Metric label="Belum Dibaca" value={unreadCount} accent="accent" />
        <Metric
          label="Sudah Dibaca"
          value={notifications.length - unreadCount}
          accent="success"
        />
      </div>

      <div className="card">
        {/* Header with tabs */}
        <div className="flex flex-col justify-between gap-3 border-b border-border px-6 py-4 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-1 rounded-lg bg-background-alt p-1">
            <FilterTab
              active={filter === "ALL"}
              onClick={() => setFilter("ALL")}
            >
              Semua
            </FilterTab>
            <FilterTab
              active={filter === "UNREAD"}
              onClick={() => setFilter("UNREAD")}
            >
              Belum Dibaca {unreadCount > 0 ? `(${unreadCount})` : ""}
            </FilterTab>
            <FilterTab
              active={filter === "READ"}
              onClick={() => setFilter("READ")}
            >
              Sudah Dibaca
            </FilterTab>
          </div>

          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="btn btn-secondary btn-sm"
          >
            Tandai Semua Dibaca
          </button>
        </div>

        {/* Messages */}
        {message ? (
          <div className="px-6 pt-4">
            <div className="alert alert-success">{message}</div>
          </div>
        ) : null}
        {error ? (
          <div className="px-6 pt-4">
            <div className="alert alert-danger">{error}</div>
          </div>
        ) : null}

        {/* List */}
        {isLoading ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-text-muted">Memuat notifikasi...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-text-muted">
              Tidak ada notifikasi untuk filter ini.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredNotifications.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-4 px-6 py-4 ${
                  !n.isRead ? "bg-primary-soft/30" : ""
                }`}
              >
                {/* Type icon */}
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${typeIconClass(n.type)}`}
                >
                  <NotifIcon type={n.type} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-text-primary">{n.title}</h3>
                    {!n.isRead ? (
                      <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    {n.message}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
                    {n.entityType ? <span>{n.entityType}</span> : null}
                    {n.createdAt ? <span>{n.createdAt}</span> : null}
                  </div>
                </div>

                {!n.isRead ? (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="btn btn-secondary btn-sm shrink-0"
                  >
                    Tandai Dibaca
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProtectedPage>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "primary" | "accent" | "success";
}) {
  const accentColor: Record<typeof accent, string> = {
    primary: "bg-primary",
    accent: "bg-accent",
    success: "bg-success",
  };

  return (
    <div className="card relative overflow-hidden">
      <div
        className={`absolute left-0 top-0 h-full w-1 ${accentColor[accent]}`}
      />
      <div className="px-5 py-4 pl-6">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-text-primary tabular-nums">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-surface text-text-primary shadow-sm"
          : "text-text-muted hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function typeIconClass(type: string) {
  switch (type) {
    case "SUCCESS":
      return "bg-success-soft text-success";
    case "WARNING":
      return "bg-warning-soft text-warning";
    case "ERROR":
      return "bg-danger-soft text-danger";
    default:
      return "bg-info-soft text-info";
  }
}

function NotifIcon({ type }: { type: string }) {
  // Simple bell icon, could be customized per type
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {type === "SUCCESS" ? (
        <polyline points="20 6 9 17 4 12" />
      ) : type === "ERROR" ? (
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </>
      ) : type === "WARNING" ? (
        <>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </>
      ) : (
        <>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </>
      )}
    </svg>
  );
}
