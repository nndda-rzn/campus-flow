"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  ClipboardList,
  FileText,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
import {
  getAdminOperationalDashboard,
  getSLAAtRiskRequests,
  type AdminOperationalDashboard,
  type SLAAtRiskItem,
} from "@/lib/admin-dashboard-api";
import { cn } from "@/lib/cn";

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
  const [opsDashboard, setOpsDashboard] = useState<AdminOperationalDashboard | null>(null);
  const [slaAtRisk, setSlaAtRisk] = useState<SLAAtRiskItem[]>([]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    listAllAcademicRequests(token)
      .then((res) => setRequests(res.data?.requests ?? []))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Gagal memuat data"),
      );

    getAdminOperationalDashboard()
      .then(setOpsDashboard)
      .catch(() => {});

    getSLAAtRiskRequests(5)
      .then(setSlaAtRisk)
      .catch(() => {});
  }, []);

  const isLoading = requests === null && !error;

  // Compute metric counts from requests
  const counts = { submitted: 0, verified: 0, approved: 0, completed: 0 };
  if (requests) {
    requests.forEach((r) => {
      switch (r.status) {
        case "SUBMITTED": counts.submitted++; break;
        case "VERIFIED": counts.verified++; break;
        case "APPROVED": counts.approved++; break;
        case "COMPLETED": counts.completed++; break;
      }
    });
  }

  const total = requests?.length ?? 0;
  const recent = requests
    ? [...requests]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
    : [];

  const hasSLAIssues = opsDashboard && ((opsDashboard.sla_at_risk_count ?? 0) > 0 || (opsDashboard.sla_breached_count ?? 0) > 0);

  return (
    <div className="space-y-6">
      {/* ── SLA Alert Banner ── */}
      {hasSLAIssues && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border px-4 py-3",
            (opsDashboard.sla_breached_count ?? 0) > 0
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-amber-200 bg-amber-50 text-amber-800",
          )}
        >
          {(opsDashboard.sla_breached_count ?? 0) > 0 ? (
            <ShieldAlert className="size-5 shrink-0" />
          ) : (
            <AlertTriangle className="size-5 shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {(opsDashboard.sla_breached_count ?? 0) > 0
                ? `${opsDashboard.sla_breached_count} pengajuan telah melewati batas SLA`
                : `${opsDashboard.sla_at_risk_count} pengajuan mendekati batas SLA (< 24 jam)`}
            </p>
            <p className="text-xs mt-0.5 opacity-80">
              Segera verifikasi untuk menghindari keterlambatan layanan.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href="/admin/academic-requests?status=SUBMITTED">Lihat</Link>
          </Button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KPICard
          label="Menunggu Verifikasi"
          value={opsDashboard?.pending_verification_count ?? counts.submitted}
          icon={<ClipboardList className="size-4" />}
          tone="info"
          isLoading={isLoading && !opsDashboard}
        />
        <KPICard
          label="SLA Berisiko"
          value={opsDashboard?.sla_at_risk_count ?? 0}
          icon={<AlertTriangle className="size-4" />}
          tone="warning"
          isLoading={!opsDashboard}
        />
        <KPICard
          label="SLA Terlewat"
          value={opsDashboard?.sla_breached_count ?? 0}
          icon={<ShieldAlert className="size-4" />}
          tone="danger"
          isLoading={!opsDashboard}
        />
        <KPICard
          label="Rata-rata Verifikasi"
          value={opsDashboard ? `${(opsDashboard.avg_verification_time_hours ?? 0).toFixed(1)} jam` : "-"}
          icon={<Clock className="size-4" />}
          tone="neutral"
          isLoading={!opsDashboard}
        />
        <KPICard
          label="Throughput Minggu Ini"
          value={opsDashboard?.weekly_throughput ?? 0}
          icon={<Zap className="size-4" />}
          tone="success"
          isLoading={!opsDashboard}
        />
      </section>

      {/* ── Sparkline + At-Risk Table ── */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Sparkline chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Pengajuan 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {opsDashboard?.requests_by_day ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={opsDashboard.requests_by_day.map((d) => ({
                  date: d.date.slice(5),
                  count: d.count,
                }))}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-accent, #6366f1)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[140px]">
                <Skeleton className="h-24 w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* SLA At-Risk Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 text-amber-500" />
              Request Mendesak
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/academic-requests?status=SUBMITTED">
                Lihat semua <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {slaAtRisk.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="size-5 text-green-500" />}
                title="Semua aman"
                description="Tidak ada pengajuan yang mendekati batas SLA."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Pengajuan</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Sisa Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slaAtRisk.map((item) => (
                    <TableRow key={item.request_id}>
                      <TableCell className="font-mono text-xs">
                        {item.request_number}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            item.hours_remaining < 0
                              ? "text-red-600"
                              : item.hours_remaining < 12
                                ? "text-amber-600"
                                : "text-green-600",
                          )}
                        >
                          {item.hours_remaining < 0
                            ? `Terlewat ${Math.abs(item.hours_remaining).toFixed(0)} jam`
                            : `${item.hours_remaining.toFixed(0)} jam`}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Quick actions + Recent activity ── */}
      <section className="grid gap-4 lg:grid-cols-3">
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

// ─── KPICard ────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  icon,
  tone,
  isLoading,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: "info" | "warning" | "danger" | "success" | "neutral";
  isLoading: boolean;
}) {
  const toneStyles = {
    info: "bg-blue-50 text-blue-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
    success: "bg-green-50 text-green-600",
    neutral: "bg-gray-50 text-gray-600",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <span className={cn("flex size-8 items-center justify-center rounded-md", toneStyles[tone])}>
            {icon}
          </span>
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            {label}
          </p>
        </div>
        <div className="mt-2">
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-[24px] font-semibold leading-none tabular-nums text-text-primary">
              {value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
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
