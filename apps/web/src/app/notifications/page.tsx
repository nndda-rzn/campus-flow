"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Inbox,
  Info,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getAccessToken } from "@/lib/auth-storage";
import {
  listMyNotifications,
  markNotificationAsRead,
  type NotificationItem,
} from "@/lib/notification-api";
import { cn } from "@/lib/cn";

type FilterValue = "ALL" | "UNREAD" | "READ";

export default function NotificationsPage() {
  return (
    <ProtectedPage
      title="Notifikasi"
      description="Pemberitahuan dari workflow akademik dan pengajuan dosen pembimbing."
    >
      <NotificationsContent />
    </ProtectedPage>
  );
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  async function loadNotifications() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await listMyNotifications(token);
      setNotifications(response.data.notifications);
    } catch (err) {
      toast.error("Gagal memuat notifikasi", {
        description:
          err instanceof Error ? err.message : "Terjadi kesalahan jaringan",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    if (filter === "UNREAD") return notifications.filter((n) => !n.isRead);
    if (filter === "READ") return notifications.filter((n) => n.isRead);
    return notifications;
  }, [filter, notifications]);

  async function handleMarkAsRead(notification: NotificationItem) {
    const token = getAccessToken();
    if (!token) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
    );

    try {
      await markNotificationAsRead(token, {
        notification_id: notification.id,
      });
    } catch (err) {
      // Rollback
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: false } : n,
        ),
      );
      toast.error("Gagal menandai notifikasi", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    }
  }

  async function handleMarkAllAsRead() {
    const token = getAccessToken();
    if (!token) return;

    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;

    setIsMarkingAll(true);

    try {
      await Promise.all(
        unread.map((n) =>
          markNotificationAsRead(token, { notification_id: n.id }),
        ),
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success(`${unread.length} notifikasi ditandai dibaca`);
    } catch (err) {
      toast.error("Gagal menandai semua", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
      await loadNotifications();
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as FilterValue)}
        >
          <TabsList>
            <TabsTrigger value="ALL">
              Semua
              <span className="ml-1 rounded-full bg-background-alt px-1.5 py-0 text-[10.5px] font-semibold tabular-nums leading-tight text-text-secondary">
                {notifications.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="UNREAD">
              Belum Dibaca
              {unreadCount > 0 ? (
                <span className="ml-1 rounded-full bg-info-soft px-1.5 py-0 text-[10.5px] font-semibold tabular-nums leading-tight text-info-text">
                  {unreadCount}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="READ">Sudah Dibaca</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0 || isMarkingAll}
          loading={isMarkingAll}
        >
          {!isMarkingAll && <CheckCheck className="size-3.5" />}
          Tandai Semua Dibaca
        </Button>
      </div>

      {/* ── List ── */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <NotificationListSkeleton />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-4" />}
            title={
              filter === "UNREAD"
                ? "Tidak ada notifikasi baru"
                : "Belum ada notifikasi"
            }
            description={
              filter === "UNREAD"
                ? "Semua notifikasi sudah dibaca. Akan muncul di sini saat ada update workflow baru."
                : "Notifikasi dari workflow akan muncul di sini secara otomatis."
            }
          />
        ) : (
          <ul>
            {filteredNotifications.map((notification, idx) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                isLast={idx === filteredNotifications.length - 1}
                onMarkAsRead={() => handleMarkAsRead(notification)}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function NotificationRow({
  notification,
  isLast,
  onMarkAsRead,
}: {
  notification: NotificationItem;
  isLast: boolean;
  onMarkAsRead: () => void;
}) {
  const cfg = typeConfig(notification.type);
  const Icon = cfg.icon;

  return (
    <li
      className={cn(
        "group relative flex items-start gap-3 px-5 py-4 transition-colors",
        !isLast && "border-b border-border",
        !notification.isRead && "bg-info-soft/20",
      )}
    >
      {/* Unread indicator (left rail) */}
      {!notification.isRead ? (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-0.5 bg-info"
        />
      ) : null}

      {/* Type icon */}
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
          cfg.iconBg,
        )}
      >
        <Icon className="size-3.5" />
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p
            className={cn(
              "flex-1 text-[13.5px] leading-tight",
              !notification.isRead
                ? "font-semibold text-text-primary"
                : "font-medium text-text-secondary",
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead ? (
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-info" />
          ) : null}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
          {notification.message}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-text-muted">
          {notification.entityType ? (
            <Badge variant="outline" withDot={false} className="!py-0">
              {notification.entityType.replace(/_/g, " ").toLowerCase()}
            </Badge>
          ) : null}
          {notification.createdAt ? (
            <span>{formatRelative(notification.createdAt)}</span>
          ) : null}
        </div>
      </div>

      {/* Action */}
      {!notification.isRead ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onMarkAsRead}
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          <CheckCircle2 className="size-3.5" />
          Tandai dibaca
        </Button>
      ) : null}
    </li>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function NotificationListSkeleton() {
  return (
    <ul>
      {[0, 1, 2, 3, 4].map((i) => (
        <li
          key={i}
          className="flex items-start gap-3 border-b border-border px-5 py-4 last:border-b-0"
        >
          <Skeleton className="size-8 shrink-0 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function typeConfig(type: string) {
  switch (type) {
    case "SUCCESS":
      return {
        icon: CheckCircle2,
        iconBg: "bg-success-soft text-success border-success-soft",
      };
    case "WARNING":
      return {
        icon: AlertTriangle,
        iconBg: "bg-warning-soft text-warning border-warning-soft",
      };
    case "ERROR":
      return {
        icon: XCircle,
        iconBg: "bg-danger-soft text-danger border-danger-soft",
      };
    case "INFO":
      return {
        icon: Info,
        iconBg: "bg-info-soft text-info border-info-soft",
      };
    default:
      return {
        icon: Bell,
        iconBg: "bg-background-alt text-text-secondary border-border",
      };
  }
}

function formatRelative(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  const isoLike = dateStr.replace(" ", "T");
  const date = new Date(isoLike);
  if (isNaN(date.getTime())) return dateStr;

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7) return `${days} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
