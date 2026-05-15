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
    if (filter === "UNREAD") {
      return notifications.filter((item) => !item.isRead);
    }

    if (filter === "READ") {
      return notifications.filter((item) => item.isRead);
    }

    return notifications;
  }, [filter, notifications]);

  async function handleMarkAsRead(notificationId: string) {
    const token = getAccessToken();
    if (!token) return;

    setMessage("");
    setError("");

    try {
      await markNotificationAsRead(token, {
        notification_id: notificationId,
      });

      setMessage("Notifikasi berhasil ditandai sebagai dibaca.");
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

    const unreadNotifications = notifications.filter((item) => !item.isRead);

    setMessage("");
    setError("");

    try {
      await Promise.all(
        unreadNotifications.map((item) =>
          markNotificationAsRead(token, {
            notification_id: item.id,
          }),
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
      title="Notifications"
      description="Daftar notifikasi in-app dari workflow akademik dan pengajuan dosen pembimbing."
    >
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Metric label="Total Notifikasi" value={notifications.length} />
        <Metric label="Belum Dibaca" value={unreadCount} />
        <Metric
          label="Sudah Dibaca"
          value={notifications.length - unreadCount}
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">Daftar Notifikasi</h2>
            <p className="mt-1 text-sm text-slate-500">
              Notifikasi terbaru ditampilkan berdasarkan waktu dibuat.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("ALL")}
              className={filterButtonClass(filter === "ALL")}
            >
              Semua
            </button>
            <button
              onClick={() => setFilter("UNREAD")}
              className={filterButtonClass(filter === "UNREAD")}
            >
              Belum Dibaca
            </button>
            <button
              onClick={() => setFilter("READ")}
              className={filterButtonClass(filter === "READ")}
            >
              Dibaca
            </button>
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tandai Semua Dibaca
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <p className="text-sm text-slate-500">Memuat notifikasi...</p>
          ) : filteredNotifications.length === 0 ? (
            <p className="text-sm text-slate-500">
              Tidak ada notifikasi untuk filter ini.
            </p>
          ) : (
            filteredNotifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-xl border p-4 ${
                  notification.isRead
                    ? "border-slate-200 bg-white"
                    : "border-slate-300 bg-slate-50"
                }`}
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-slate-900">
                        {notification.title}
                      </h3>

                      <span className={typeBadgeClass(notification.type)}>
                        {notification.type}
                      </span>

                      {!notification.isRead ? (
                        <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-medium text-white">
                          Baru
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {notification.message}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{notification.entityType || "GENERAL"}</span>
                      {notification.entityId ? (
                        <span>Entity ID: {notification.entityId}</span>
                      ) : null}
                      {notification.createdAt ? (
                        <span>Dibuat: {notification.createdAt}</span>
                      ) : null}
                    </div>
                  </div>

                  {!notification.isRead ? (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Tandai Dibaca
                    </button>
                  ) : (
                    <span className="text-sm text-slate-400">Sudah dibaca</span>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </ProtectedPage>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function filterButtonClass(active: boolean) {
  return active
    ? "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
    : "rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50";
}

function typeBadgeClass(type: string) {
  switch (type) {
    case "SUCCESS":
      return "rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700";
    case "WARNING":
      return "rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700";
    case "ERROR":
      return "rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700";
    default:
      return "rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700";
  }
}
