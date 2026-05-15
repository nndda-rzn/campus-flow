"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  FileText,
  Users,
} from "lucide-react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAccessToken } from "@/lib/auth-storage";
import {
  listAllAcademicRequests,
  type AcademicRequest,
} from "@/lib/academic-api";
import { cn } from "@/lib/cn";

// ─── Metric definitions ──────────────────────────────────────────────────────

type MetricKey = "submitted" | "verified" | "approved" | "completed";

const METRIC_CONFIG: Record<
  MetricKey,
  { label: string; status: string; tone: string; iconBg: string }
> = {
  submitted: {
    label: "Menunggu Verifikasi",
    status: "SUBMITTED",
    tone: "text-info",
    iconBg: "bg-info-soft text-info",
  },
  verified: {
    label: "Diverifikasi",
    status: "VERIFIED",
    tone: "text-accent",
    iconBg: "bg-accent-soft text-accent",
  },
  approved: {
    label: "Disetujui",
    status: "APPROVED",
    tone: "text-success",
    iconBg: "bg-success-soft text-success",
  },
  completed: {
    label: "Selesai",
    status: "COMPLETED",
    tone: "text-text-secondary",
    iconBg: "bg-background-alt text-text-secondary",
  },
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Admin Prodi"
      description="Overview pengajuan layanan akademik dan dosen pembimbing yang membutuhkan tindakan."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI"]}
    >
      <DashboardContent />
    </ProtectedPage>
  );
}

function DashboardContent() {
  const [requests, setRequests] = useState<AcademicRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    listAllAcademicRequests(token)
      .then((res) => setRequests(res.data?.requests ?? []))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Gagal memuat data"),
      );
  }, []);

  const isLoading = requests === null && !error;

  // Compute metric counts
  const counts: Record<MetricKey, number> = {
    submitted: 0,
    verified: 0,
    approved: 0,
    completed: 0,
  };
  if (requests) {
    requests.forEach((r) => {
      switch (r.status) {
        case "SUBMITTED":
          counts.submitted++;
          break;
        case "VERIFIED":
          counts.verified++;
          break;
        case "APPROVED":
          counts.approved++;
          break;
        case "COMPLETED":
          counts.completed++;
          break;
      }
    });
  }

  const total = requests?.length ?? 0;
  const recent = requests
    ? [...requests]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      {/* ── Metrics row ── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((key) => {
          const cfg = METRIC_CONFIG[key];
          const count = counts[key];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <Card key={key} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-text-muted">
                      {cfg.label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <p className="text-[26px] font-semibold leading-none tracking-tight tabular-nums text-text-primary">
                        {count}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/admin/academic-requests?status=${cfg.status}`}
                    aria-label={`Lihat ${cfg.label}`}
                    className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-background-alt hover:text-text-primary"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>

                {/* Mini progress bar */}
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-background-alt">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      key === "submitted" && "bg-info",
                      key === "verified" && "bg-accent",
                      key === "approved" && "bg-success",
                      key === "completed" && "bg-text-secondary",
                    )}
                    style={{ width: `${isLoading ? 0 : pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11.5px] text-text-muted">
                  {isLoading ? (
                    <Skeleton className="inline-block h-3 w-20" />
                  ) : (
                    `${pct}% dari total ${total} pengajuan`
                  )}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* ── Quick actions + Recent activity ── */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
            Aksi Cepat
          </h2>

          <QuickActionLink
            href="/admin/academic-requests"
            icon={<FileText className="size-4" />}
            iconBg="bg-primary-soft text-primary"
            title="Layanan Akademik"
            description="Verifikasi pengajuan mahasiswa"
            count={counts.submitted}
            countLabel="menunggu"
          />

          <QuickActionLink
            href="/admin/supervisor-requests"
            icon={<Users className="size-4" />}
            iconBg="bg-accent-soft text-accent"
            title="Dosen Pembimbing"
            description="Verifikasi pengajuan pembimbing"
          />

          <QuickActionLink
            href="/reports"
            icon={<BarChart3 className="size-4" />}
            iconBg="bg-info-soft text-info"
            title="Reporting"
            description="Distribusi & analitik pengajuan"
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
                5 pengajuan terbaru dari semua status
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/academic-requests">
                Lihat semua
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>

          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4">
              <EmptyState
                icon={<FileText className="size-4" />}
                title="Tidak dapat memuat pengajuan"
                description={error}
              />
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<FileText className="size-4" />}
              title="Belum ada pengajuan"
              description="Pengajuan dari mahasiswa akan muncul di sini secara otomatis."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Pengajuan</TableHead>
                  <TableHead>Layanan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="line-clamp-1 text-[13.5px] font-medium text-text-primary">
                        {r.title}
                      </p>
                      <p className="mt-0.5 font-mono text-[11.5px] text-text-muted">
                        {r.requestNumber}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-text-secondary">
                        {r.serviceName}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </section>
    </div>
  );
}

// ─── QuickActionLink ─────────────────────────────────────────────────────────

function QuickActionLink({
  href,
  icon,
  iconBg,
  title,
  description,
  count,
  countLabel,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  count?: number;
  countLabel?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,transform] duration-150 hover:border-border-strong hover:shadow-[0_4px_12px_rgba(15,23,42,0.08),0_2px_4px_rgba(15,23,42,0.04)]"
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
      {count !== undefined && count > 0 ? (
        <div className="flex flex-col items-end gap-0.5">
          <span className="rounded-full bg-info-soft px-2 py-0.5 text-[11px] font-semibold leading-tight text-info-text tabular-nums">
            {count}
          </span>
          {countLabel ? (
            <span className="text-[10.5px] text-text-muted">{countLabel}</span>
          ) : null}
        </div>
      ) : (
        <ArrowRight className="size-4 shrink-0 text-text-disabled transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
      )}
    </Link>
  );
}
