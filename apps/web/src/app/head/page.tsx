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
  GraduationCap,
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

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    listAllAcademicRequests(token)
      .then((res) => setRequests(res.data?.requests ?? []))
      .catch(() => setRequests([]));
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
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            href="/reports"
            icon={<BarChart3 className="size-4" />}
            iconBg="bg-info-soft text-info"
            title="Reporting"
            description="Lihat distribusi pengajuan"
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
}: {
  label: string;
  value: number;
  tone: string;
  progressTone: string;
  progress: number;
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
