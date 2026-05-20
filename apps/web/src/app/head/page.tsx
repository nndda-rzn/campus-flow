"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  ShieldAlert,
} from "lucide-react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAccessToken } from "@/lib/auth-storage";
import { AcademicRequest, listAllAcademicRequests } from "@/lib/academic-api";
import {
  AdminOperationalDashboard,
  SLAAtRiskItem,
  getAdminOperationalDashboard,
  getSLAAtRiskRequests,
} from "@/lib/admin-dashboard-api";
import {
  ThesisOverviewData,
  getThesisOverview,
} from "@/lib/thesis-overview-api";
import { cn } from "@/lib/cn";

export default function HeadDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Kaprodi"
      description="Approval layanan akademik dan penetapan dosen pembimbing yang menunggu keputusan."
      allowedRoles={["KAPRODI"]}
    >
      <DashboardContent />
    </ProtectedPage>
  );
}

function DashboardContent() {
  const [requests, setRequests] = useState<AcademicRequest[] | null>(null);
  const [slaDashboard, setSlaDashboard] = useState<AdminOperationalDashboard | null>(null);
  const [slaAtRisk, setSlaAtRisk] = useState<SLAAtRiskItem[]>([]);
  const [thesisData, setThesisData] = useState<ThesisOverviewData | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    listAllAcademicRequests(token)
      .then((res) => setRequests(res.data?.requests ?? []))
      .catch(() => setRequests([]));
    getAdminOperationalDashboard()
      .then(setSlaDashboard)
      .catch(() => {});
    getSLAAtRiskRequests(10)
      .then(setSlaAtRisk)
      .catch(() => {});
    getThesisOverview()
      .then(setThesisData)
      .catch(() => {});
  }, []);

  const isLoading = requests === null;
  const verifiedCount = requests
    ? requests.filter((r) => r.status === "VERIFIED").length
    : 0;
  const approvedCount = requests
    ? requests.filter((r) => r.status === "APPROVED").length
    : 0;
  const rejectedCount = requests
    ? requests.filter((r) => r.status === "REJECTED").length
    : 0;

  const pendingDecisions = requests
    ? requests.filter((r) => r.status === "VERIFIED").slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiTile
          label="Menunggu Keputusan"
          value={verifiedCount}
          tone="text-warning"
          progressTone="bg-warning"
          progress={
            requests && requests.length > 0
              ? (verifiedCount / requests.length) * 100
              : 0
          }
          isLoading={isLoading}
        />
        <KpiTile
          label="Disetujui"
          value={approvedCount}
          tone="text-success"
          progressTone="bg-success"
          progress={
            requests && requests.length > 0
              ? (approvedCount / requests.length) * 100
              : 0
          }
          isLoading={isLoading}
        />
        <KpiTile
          label="Ditolak"
          value={rejectedCount}
          tone="text-danger"
          progressTone="bg-danger"
          progress={
            requests && requests.length > 0
              ? (rejectedCount / requests.length) * 100
              : 0
          }
          isLoading={isLoading}
        />
        <KpiTile
          label="SLA Berisiko"
          value={slaDashboard?.sla_at_risk_count ?? 0}
          tone="text-warning"
          progressTone="bg-warning"
          progress={0}
          isLoading={slaDashboard === null}
          icon={<AlertTriangle className="size-3.5 text-warning" />}
        />
        <KpiTile
          label="SLA Terlewat"
          value={slaDashboard?.sla_breached_count ?? 0}
          tone="text-danger"
          progressTone="bg-danger"
          progress={0}
          isLoading={slaDashboard === null}
          icon={<ShieldAlert className="size-3.5 text-danger" />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
            Aksi Cepat
          </h2>
          <QuickAction
            href="/head/academic-requests"
            icon={<FileText className="size-4" />}
            iconBg="bg-primary-soft text-primary"
            title="Layanan Akademik"
            description="Setujui atau tolak pengajuan"
            count={verifiedCount}
            countLabel="menunggu"
          />
          <QuickAction
            href="/head/supervisor-requests"
            icon={<GraduationCap className="size-4" />}
            iconBg="bg-accent-soft text-accent"
            title="Dosen Pembimbing"
            description="Tetapkan dosen pembimbing"
          />
          <QuickAction
            href="/admin/thesis-overview"
            icon={<GraduationCap className="size-4" />}
            iconBg="bg-success-soft text-success"
            title="Progress Skripsi"
            description="Pantau progress mahasiswa"
            count={thesisData?.behind ?? undefined}
            countLabel="terlambat"
          />
          <QuickAction
            href="/reports"
            icon={<BarChart3 className="size-4" />}
            iconBg="bg-info-soft text-info"
            title="Reporting"
            description="Lihat distribusi pengajuan"
          />
          <QuickAction
            href="/head/analytics"
            icon={<BarChart3 className="size-4" />}
            iconBg="bg-primary-soft text-primary"
            title="Analitik"
            description="Tren dan performa pengajuan"
          />
          <QuickAction
            href="/head/delegations"
            icon={<Clock className="size-4" />}
            iconBg="bg-slate-100 text-slate-600"
            title="Delegasi"
            description="Kelola delegasi approval"
          />
        </div>

        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-4 text-text-muted" />
                Pengajuan Menunggu Keputusan
              </CardTitle>
              <p className="mt-0.5 text-[12.5px] text-text-muted">
                Pengajuan berstatus VERIFIED yang siap di-approve
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/head/academic-requests">
                Buka semua
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
          ) : pendingDecisions.length === 0 ? (
            <EmptyState
              icon={<FileText className="size-4" />}
              title="Tidak ada yang menunggu"
              description="Pengajuan yang sudah diverifikasi Admin Prodi akan muncul di sini."
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
                {pendingDecisions.map((r) => (
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

      {/* SLA At-Risk Section */}
      {slaAtRisk.length > 0 && (
        <section>
          <Card className="overflow-hidden border-warning/30">
            <CardHeader className="flex-row items-center justify-between bg-warning/5">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-warning" />
                  Pengajuan Mendekati / Melewati Deadline
                </CardTitle>
                <p className="mt-0.5 text-[12.5px] text-text-muted">
                  Pengajuan yang perlu segera ditindaklanjuti berdasarkan SLA
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/head/academic-requests?status=VERIFIED">
                  Lihat semua
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Pengajuan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sisa Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slaAtRisk.map((item) => (
                  <TableRow key={item.request_id}>
                    <TableCell>
                      <p className="line-clamp-1 text-[13.5px] font-medium text-text-primary">
                        {item.title}
                      </p>
                      <p className="mt-0.5 font-mono text-[11.5px] text-text-muted">
                        {item.request_number}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <SlaTimeLabel hoursRemaining={item.hours_remaining} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}

      {/* Thesis Progress Summary */}
      {thesisData && thesisData.total > 0 && (
        <section>
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="size-4 text-text-muted" />
                  Progress Skripsi Mahasiswa
                </CardTitle>
                <p className="mt-0.5 text-[12.5px] text-text-muted">
                  Ringkasan progress bimbingan skripsi di prodi
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/thesis-overview">
                  Detail
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ThesisStatTile label="Total" value={thesisData.total} tone="text-text-primary" />
                <ThesisStatTile label="On Track" value={thesisData.on_track} tone="text-success" />
                <ThesisStatTile label="Terlambat" value={thesisData.behind} tone="text-warning" />
                <ThesisStatTile label="Belum Mulai" value={thesisData.not_started} tone="text-text-muted" />
              </div>
              {thesisData.total > 0 && (
                <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-background-alt">
                  {thesisData.on_track > 0 && (
                    <div
                      className="h-full bg-success transition-all"
                      style={{ width: `${(thesisData.on_track / thesisData.total) * 100}%` }}
                      title={`On Track: ${thesisData.on_track}`}
                    />
                  )}
                  {thesisData.behind > 0 && (
                    <div
                      className="h-full bg-warning transition-all"
                      style={{ width: `${(thesisData.behind / thesisData.total) * 100}%` }}
                      title={`Terlambat: ${thesisData.behind}`}
                    />
                  )}
                  {thesisData.not_started > 0 && (
                    <div
                      className="h-full bg-slate-300 transition-all"
                      style={{ width: `${(thesisData.not_started / thesisData.total) * 100}%` }}
                      title={`Belum Mulai: ${thesisData.not_started}`}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  tone,
  progressTone,
  progress,
  isLoading,
  icon,
}: {
  label: string;
  value: number;
  tone: string;
  progressTone: string;
  progress: number;
  isLoading: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[0.04em] text-text-muted">
          {icon}
          {label}
        </p>
        {isLoading ? (
          <Skeleton className="mt-2 h-7 w-16" />
        ) : (
          <p
            className={cn(
              "mt-1.5 text-[26px] font-semibold leading-none tracking-tight tabular-nums",
              tone,
            )}
          >
            {value}
          </p>
        )}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-background-alt">
          <div
            className={cn("h-full rounded-full transition-all", progressTone)}
            style={{ width: `${isLoading ? 0 : progress}%` }}
          />
        </div>
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
      {count !== undefined && count > 0 ? (
        <div className="flex flex-col items-end">
          <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold leading-tight text-warning-text tabular-nums">
            {count}
          </span>
          {countLabel ? (
            <span className="mt-0.5 text-[10.5px] text-text-muted">
              {countLabel}
            </span>
          ) : null}
        </div>
      ) : (
        <ArrowUpRight className="size-3.5 shrink-0 text-text-disabled transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
      )}
    </Link>
  );
}

function SlaTimeLabel({ hoursRemaining }: { hoursRemaining: number }) {
  const isOverdue = hoursRemaining < 0;
  const absHours = Math.abs(hoursRemaining);

  let label: string;
  if (absHours < 1) {
    const mins = Math.max(1, Math.round(absHours * 60));
    label = `${mins}m`;
  } else if (absHours < 24) {
    label = `${Math.round(absHours)}j`;
  } else {
    label = `${Math.round(absHours / 24)}h`;
  }

  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11.5px] font-semibold text-danger">
        <Clock className="size-3" />
        Telat {label}
      </span>
    );
  }

  if (absHours < 24) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11.5px] font-semibold text-warning">
        <Clock className="size-3" />
        Sisa {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-text-muted">
      <Clock className="size-3" />
      Sisa {label}
    </span>
  );
}

function ThesisStatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background-alt p-3 text-center">
      <p className={cn("text-[20px] font-semibold leading-none tabular-nums", tone)}>
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.04em] text-text-muted">
        {label}
      </p>
    </div>
  );
}
