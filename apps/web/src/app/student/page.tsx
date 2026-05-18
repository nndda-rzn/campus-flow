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
  Calendar,
  Book,
  Target
} from "lucide-react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAccessToken } from "@/lib/auth-storage";
import { AcademicRequest, listMyAcademicRequests } from "@/lib/academic-api";
import { getStudentThesisProgress, ThesisProgressItem } from "@/lib/thesis-api";
import { getStudentGuidanceLogs, GuidanceLogItem } from "@/lib/guidance-api";
import { getAcademicCalendar, AcademicCalendarItem } from "@/lib/calendar-api";
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
  const [progress, setProgress] = useState<ThesisProgressItem[] | null>(null);
  const [logs, setLogs] = useState<GuidanceLogItem[] | null>(null);
  const [events, setEvents] = useState<AcademicCalendarItem[] | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    // Load academic requests
    listMyAcademicRequests(token)
      .then((res) => setRequests(res.data?.requests ?? []))
      .catch(() => setRequests([]));

    // Load thesis progress
    getStudentThesisProgress(token)
      .then((res) => setProgress(res.data?.items ?? []))
      .catch(() => setProgress([]));

    // Load guidance logs
    getStudentGuidanceLogs(token)
      .then((res) => setLogs(res.data?.items ?? []))
      .catch(() => setLogs([]));

    // Load upcoming calendar events
    const today = new Date().toISOString().split('T')[0];
    getAcademicCalendar(token, { startDate: today })
      .then((res) => {
        // Just take the next 3 events
        const allEvents = res.data?.items ?? [];
        setEvents(allEvents.slice(0, 3));
      })
      .catch(() => setEvents([]));

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

  // Calculate thesis progress percentage
  const completedMilestones = progress ? progress.filter(p => p.status === "COMPLETED").length : 0;
  const totalMilestones = progress ? progress.length : 0;
  const progressPercentage = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Surat Diproses"
          value={inProgress}
          tone="info"
          isLoading={isLoading}
        />
        <StatTile
          label="Surat Selesai"
          value={completed}
          tone="success"
          isLoading={isLoading}
        />
        <StatTile
          label="Sesi Bimbingan"
          value={logs?.length ?? 0}
          tone="primary"
          isLoading={isLoading}
        />
        <Card>
          <CardContent className="p-4">
            <p className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-text-muted">
              Progress Skripsi
            </p>
            {isLoading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-text-primary">
                {progressPercentage}%
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {/* Left column: Progress & Timeline */}
        <div className="xl:col-span-2 space-y-4">
          {/* Thesis Progress Card */}
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4 text-text-muted" />
                Progress Tugas Akhir
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/student/thesis-progress">
                  Lihat Detail
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : progress && progress.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-in-out" 
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 text-[12px]">
                    {progress.map((p, idx) => (
                      <div key={p.id} className={cn(
                        "flex items-center gap-1.5",
                        p.status === "COMPLETED" ? "text-success font-medium" : 
                        p.status === "IN_PROGRESS" ? "text-primary font-medium" : "text-text-muted"
                      )}>
                        {p.status === "COMPLETED" ? "✅" : p.status === "IN_PROGRESS" ? "🔵" : "⚪"}
                        <span className="hidden sm:inline">{p.milestoneName}</span>
                        <span className="sm:hidden">Tahap {idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Belum Mulai Skripsi"
                  description="Progress akan muncul setelah pengajuan dosen pembimbing disetujui."
                />
              )}
            </CardContent>
          </Card>

          {/* Recent Academic Requests */}
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="size-4 text-text-muted" />
                  Pengajuan Surat Terbaru
                </CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/student/academic-requests">
                  Semua
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>

            {isLoading ? (
              <div className="space-y-2 p-4">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <EmptyState
                icon={<FileText className="size-4" />}
                title="Belum ada pengajuan"
                description="Mulai dengan membuat pengajuan layanan akademik."
              />
            ) : (
              <ul className="divide-y divide-border">
                {recent.slice(0, 3).map((r) => (
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
        </div>

        {/* Right column: Quick Actions & Calendar */}
        <div className="xl:col-span-1 space-y-4">
          {/* Upcoming Events */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-4 text-text-muted" />
                Jadwal Mendatang
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 py-0 pb-3">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : events && events.length > 0 ? (
                <ul className="divide-y divide-border/50">
                  {events.map((event) => {
                    const date = new Date(event.startDate);
                    const formattedDate = new Intl.DateTimeFormat("id-ID", {
                      day: "numeric", month: "short"
                    }).format(date);
                    
                    return (
                      <li key={event.id} className="flex gap-3 px-5 py-2.5">
                        <div className="flex flex-col items-center justify-center min-w-[40px] text-center">
                          <span className="text-[10px] uppercase font-bold text-primary tracking-wider">{date.toLocaleString('id-ID', { month: 'short' })}</span>
                          <span className="text-[18px] font-semibold text-text-primary leading-none">{date.getDate()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-text-primary line-clamp-1">{event.title}</p>
                          <p className="text-[11.5px] text-text-muted">{event.eventType}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-5 text-center text-[13px] text-text-muted">
                  Tidak ada agenda dalam waktu dekat
                </div>
              )}
              <div className="px-5 mt-2">
                <Button asChild variant="outline" size="sm" className="w-full text-[12px]">
                  <Link href="/student/calendar">Lihat Kalender Akademik</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="space-y-3">
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
              Aksi Cepat
            </h2>

            <QuickAction
              href="/student/academic-requests"
              icon={<PlusCircle className="size-4" />}
              iconBg="bg-success-soft text-success"
              title="Ajukan Surat"
              description="Buat pengajuan layanan akademik"
            />
            <QuickAction
              href="/student/guidance-logs"
              icon={<Book className="size-4" />}
              iconBg="bg-primary-soft text-primary"
              title="Catat Bimbingan"
              description="Isi logbook bimbingan skripsi"
            />
          </div>
        </div>
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
