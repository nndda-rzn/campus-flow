/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  clearAuthSession,
  getAccessToken,
  getCurrentUser,
} from "@/lib/auth-storage";
import type { UserProfile, UserRole } from "@/types/auth";
import { listMyNotifications } from "@/lib/notification-api";

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
      .catch(() => {
        setUnreadCount(0);
      });
  }, [allowedRoles, router]);

  function handleLogout() {
    clearAuthSession();
    router.replace("/login");
  }

  const canOpenReports =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "ADMIN_PRODI" ||
    user?.role === "KAPRODI" ||
    user?.role === "TATA_USAHA";

  if (status == "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Memeriksa sesi...</p>
      </main>
    );
  }

  if (status == "forbidden") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Akses ditolak</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Role Anda tidak memiliki akses ke halaman ini.
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Logout
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link
              href="/dashboard"
              className="text-lg font-bold text-slate-900"
            >
              CampusFlow
            </Link>
            <p className="text-xs text-slate-500">
              {user?.fullName} · {user?.role}
            </p>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-slate-600 hover:text-slate-900"
            >
              Dashboard
            </Link>

            <Link
              href="/notifications"
              className="relative text-slate-600 hover:text-slate-900"
            >
              Notifications
              {unreadCount > 0 ? (
                <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </Link>

            {canOpenReports ? (
              <Link
                href="/reports"
                className="text-slate-600 hover:text-slate-900"
              >
                Reports
              </Link>
            ) : null}

            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>

        {children}
      </section>
    </main>
  );
}
