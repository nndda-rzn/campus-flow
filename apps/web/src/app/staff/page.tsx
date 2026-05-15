"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  FileCheck,
  FileText,
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

export default function StaffDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Tata Usaha"
      description="Upload dokumen final dan selesaikan pengajuan akademik yang sudah disetujui Kaprodi."
      allowedRoles={["TATA_USAHA", "SUPER_ADMIN"]}
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
  const approvedCount = requests
    ? requests.filter((r) => r.status === "APPROVED").length
    : 0;
  const completedCount = requests
    ? requests.filter((r) => r.status === "COMPLETED").length
    : 0;

  const pending = requests
    ? requests.filter((r) => r.status === "APPROVED").slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTile
          label="Siap Diproses"
          value={approvedCount}
          tone="text-success"
          isLoading={isLoading}
        />
        <KpiTile
          label="Selesai"
          value={completedCount}
          tone="text-text-primary"
          isLoading={isLoading}
        />
        <KpiTile
          label="Total Pengajuan"
          value={requests?.length ?? 0}
          tone="text-text-primary"
          isLoading={isLoading}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
            Aksi Cepat
          </h2>
          <QuickAction
            href="/staff/academic-requests"
            icon={<FileText className="size-4" />}
            iconBg="bg-primary-soft text-primary"
            title="Pengajuan Akademik"
            description="Upload dokumen final & selesaikan"
            count={approvedCount}
            countLabel="siap proses"
          />
          <QuickAction
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
                Pengajuan Siap Diproses
              </CardTitle>
              <p className="mt-0.5 text-[12.5px] text-text-muted">
                Pengajuan APPROVED yang menunggu dokumen final
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/staff/academic-requests">
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
          ) : pending.length === 0 ? (
            <EmptyState
              icon={<FileCheck className="size-4" />}
              title="Semua sudah diproses"
              description="Pengajuan yang disetujui Kaprodi akan muncul di sini untuk diproses."
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
                {pending.map((r) => (
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
  isLoading,
}: {
  label: string;
  value: number;
  tone: string;
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
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold leading-tight text-success-text tabular-nums">
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
