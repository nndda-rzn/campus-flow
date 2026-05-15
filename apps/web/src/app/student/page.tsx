"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  FileText,
  GraduationCap,
  PlusCircle,
} from "lucide-react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAccessToken } from "@/lib/auth-storage";
import { AcademicRequest, listMyAcademicRequests } from "@/lib/academic-api";
import { cn } from "@/lib/cn";

export default function StudentDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Mahasiswa"
      description="Kelola pengajuan layanan akademik dan dosen pembimbing Anda."
      allowedRoles={["MAHASISWA"]}
    >
      <DashboardContent />
    </ProtectedPage>
  );
}

function DashboardContent() {
  const [requests, setRequests] = useState<AcademicRequest[] | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    listMyAcademicRequests(token)
      .then((res) => setRequests(res.data?.requests ?? []))
      .catch(() => setRequests([]));
  }, []);

  const isLoading = requests === null;
  const recent = requests
    ? [...requests]
        .sort(
          (a, b) =>
            new Date(b.createdAt.replace(" ", "T")).getTime() -
            new Date(a.createdAt.replace(" ", "T")).getTime(),
        )
        .slice(0, 4)
    : [];

  const inProgress = requests
    ? requests.filter(
        (r) => !["COMPLETED", "REJECTED", "CANCELLED"].includes(r.status),
      ).length
    : 0;
  const completed = requests
    ? requests.filter((r) => r.status === "COMPLETED").length
    : 0;

  return (
    <div className="space-y-6">
      {/* Quick stats row */}
      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Sedang Diproses"
          value={inProgress}
          tone="info"
          isLoading={isLoading}
        />
        <StatTile
          label="Selesai"
          value={completed}
          tone="success"
          isLoading={isLoading}
        />
        <StatTile
          label="Total Pengajuan"
          value={requests?.length ?? 0}
          tone="primary"
          isLoading={isLoading}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
            Aksi Cepat
          </h2>

          <QuickAction
            href="/student/academic-requests"
            icon={<FileText className="size-4" />}
            iconBg="bg-primary-soft text-primary"
            title="Layanan Akademik"
            description="Surat aktif kuliah, magang, penelitian, rekomendasi"
          />
          <QuickAction
            href="/student/supervisor-requests"
            icon={<GraduationCap className="size-4" />}
            iconBg="bg-accent-soft text-accent"
            title="Dosen Pembimbing"
            description="Ajukan topik dan calon pembimbing"
          />
          <QuickAction
            href="/student/academic-requests"
            icon={<PlusCircle className="size-4" />}
            iconBg="bg-success-soft text-success"
            title="Buat Pengajuan Baru"
            description="Mulai pengajuan layanan akademik"
          />
        </div>

        {/* Recent activity */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-4 text-text-muted" />
                Pengajuan Terbaru
              </CardTitle>
              <p className="mt-0.5 text-[12.5px] text-text-muted">
                4 pengajuan terbaru Anda
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/student/academic-requests">
                Lihat semua
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>

          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<FileText className="size-4" />}
              title="Belum ada pengajuan"
              description="Mulai dengan membuat pengajuan layanan akademik."
              action={
                <Button asChild size="sm">
                  <Link href="/student/academic-requests">
                    <PlusCircle className="size-3.5" />
                    Buat Pengajuan
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-background-alt"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[13.5px] font-medium text-text-primary">
                      {r.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[11.5px] text-text-muted">
                      {r.requestNumber}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  tone,
  isLoading,
}: {
  label: string;
  value: number;
  tone: "primary" | "info" | "success";
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-text-muted">
          {label}
        </p>
        {isLoading ? (
          <Skeleton className="mt-2 h-7 w-16" />
        ) : (
          <p
            className={cn(
              "mt-1.5 text-[26px] font-semibold leading-none tracking-tight tabular-nums",
              tone === "primary" && "text-text-primary",
              tone === "info" && "text-info",
              tone === "success" && "text-success",
            )}
          >
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon,
  iconBg,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          iconBg,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold leading-tight text-text-primary group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="mt-0.5 text-[12px] leading-tight text-text-muted">
          {description}
        </p>
      </div>
      <ArrowUpRight className="size-3.5 shrink-0 text-text-disabled transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
    </Link>
  );
}
