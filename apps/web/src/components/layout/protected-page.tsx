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
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-[12.5px] text-text-muted">Memeriksa sesi...</p>
        </div>
      </main>
    );
  }

  // ─── Forbidden state ───
  if (status === "forbidden") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <section className="card max-w-md w-full overflow-hidden">
          <div className="card-padded-lg text-center">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-danger-soft text-danger">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="heading-section">Akses Ditolak</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
              Role akun Anda tidak memiliki akses ke halaman ini. Silakan login
              dengan akun yang sesuai.
            </p>
          </div>
          <div className="border-t border-border bg-background-alt px-6 py-3.5 flex items-center justify-end">
            <button onClick={handleLogout} className="btn btn-primary btn-sm">
              Logout
            </button>
          </div>
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
