/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  clearAuthSession,
  getAccessToken,
  getCurrentUser,
} from "@/lib/auth-storage";
import type { UserProfile, UserRole } from "@/types/auth";
import { listMyNotifications } from "@/lib/notification-api";
import { AppShell } from "@/components/layout/app-shell";

type ProtectedPageProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
  title: string;
  description?: string;
};

export function ProtectedPage({
  children,
  allowedRoles,
  title,
  description,
}: ProtectedPageProps) {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<"checking" | "allowed" | "forbidden">(
    "checking",
  );
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = getAccessToken();
    const currentUser = getCurrentUser();

    if (!token || !currentUser) {
      router.replace("/login");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
      setUser(currentUser);
      setStatus("forbidden");
      return;
    }

    setUser(currentUser);
    setStatus("allowed");

    listMyNotifications(token)
      .then((response) => {
        const unread = response.data.notifications.filter(
          (item) => !item.isRead,
        ).length;
        setUnreadCount(unread);
      })
      .catch(() => setUnreadCount(0));
  }, [allowedRoles, router]);

  function handleLogout() {
    clearAuthSession();
    router.replace("/login");
  }

  // ─── Loading state ───
  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"></div>
          <p className="mt-3 text-sm text-text-muted">Memeriksa sesi...</p>
        </div>
      </main>
    );
  }

  // ─── Forbidden state ───
  if (status === "forbidden") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <section className="card card-padded max-w-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-text-primary">
            Akses Ditolak
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Role Anda tidak memiliki akses ke halaman ini.
          </p>
          <button
            onClick={handleLogout}
            className="btn btn-primary mt-6 w-full"
          >
            Logout
          </button>
        </section>
      </main>
    );
  }

  // ─── Allowed state ───
  return (
    <AppShell
      user={user!}
      unreadCount={unreadCount}
      title={title}
      description={description}
    >
      {children}
    </AppShell>
  );
}
