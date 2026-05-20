"use client";

import { Suspense, useEffect, useState } from "react";
import {
  BarChart3,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccessToken } from "@/lib/auth-storage";
import { getAcademicReport, type AcademicDashboard } from "@/lib/reporting-api";
import {
  getRequestTrends,
  getProcessingTimeReport,
  type TrendDataPoint,
  type ProcessingTimeReport,
} from "@/lib/trends-api";
import {
  getAdminOperationalDashboard,
  type AdminOperationalDashboard,
} from "@/lib/admin-dashboard-api";
import { cn } from "@/lib/cn";

export default function HeadAnalyticsPage() {
  return (
    <ProtectedPage
      title="Analitik Pengajuan"
      description="Statistik dan tren pengajuan layanan akademik untuk monitoring performa."
      allowedRoles={["KAPRODI", "SUPER_ADMIN"]}
    >
      <Suspense fallback={null}>
        <AnalyticsContent />
      </Suspense>
    </ProtectedPage>
  );
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "#6366f1",
  VERIFIED: "#3b82f6",
  APPROVED: "#22c55e",
  COMPLETED: "#10b981",
  REJECTED: "#ef4444",
  REVISION_REQUIRED: "#f59e0b",
  CANCELLED: "#94a3b8",
};

const PIE_COLORS = ["#6366f1", "#3b82f6", "#22c55e", "#10b981", "#ef4444", "#f59e0b", "#94a3b8"];

function AnalyticsContent() {
  const [academic, setAcademic] = useState<AcademicDashboard | null>(null);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [processing, setProcessing] = useState<ProcessingTimeReport | null>(null);
  const [operational, setOperational] = useState<AdminOperationalDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    Promise.all([
      getAcademicReport(token).then((r) => setAcademic(r.data ?? null)),
      getRequestTrends({ granularity: "WEEKLY" }).then(setTrends),
      getProcessingTimeReport().then(setProcessing),
      getAdminOperationalDashboard().then(setOperational),
    ])
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  const pieData = academic?.statusCounts?.map((s) => ({
    name: formatStatus(s.status),
    value: s.total,
  })) ?? [];

  const processingData = processing
    ? [
        { stage: "Submit → Verifikasi", hours: processing.avg_submission_to_verification_hours },
        { stage: "Verifikasi → Approval", hours: processing.avg_verification_to_approval_hours },
        { stage: "Approval → Selesai", hours: processing.avg_approval_to_completion_hours },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<BarChart3 className="size-4" />}
          label="Total Pengajuan"
          value={academic?.totalRequests ?? 0}
          tone="text-primary"
        />
        <MetricCard
          icon={<TrendingUp className="size-4" />}
          label="Throughput Mingguan"
          value={operational?.weekly_throughput ?? 0}
          tone="text-success"
        />
        <MetricCard
          icon={<Clock className="size-4" />}
          label="Rata-rata Proses"
          value={`${(processing?.avg_total_processing_hours ?? 0).toFixed(1)}j`}
          tone="text-info"
        />
        <MetricCard
          icon={<Activity className="size-4" />}
          label="P90 Total"
          value={`${(processing?.p90_total_hours ?? 0).toFixed(1)}j`}
          tone="text-warning"
        />
      </section>

      {/* Charts Row 1: Trends + Status Distribution */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[14px]">
              <TrendingUp className="size-4 text-text-muted" />
              Tren Volume Pengajuan (Mingguan)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trends} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    labelFormatter={(v) => `Periode: ${v}`}
                  />
                  <Area type="monotone" dataKey="submitted_count" name="Diajukan" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="approved_count" name="Disetujui" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="completed_count" name="Selesai" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="rejected_count" name="Ditolak" stroke="#ef4444" fill="#ef4444" fillOpacity={0.05} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-[13px] text-text-muted">Belum ada data tren</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[14px]">
              <BarChart3 className="size-4 text-text-muted" />
              Distribusi Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-[13px] text-text-muted">Belum ada data</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Charts Row 2: Processing Time */}
      <section>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[14px]">
              <Clock className="size-4 text-text-muted" />
              Rata-rata Waktu Proses per Tahap
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {processingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={processingData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="j" />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={140} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(value) => [`${Number(value).toFixed(1)} jam`, "Rata-rata"]}
                  />
                  <Bar dataKey="hours" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-[13px] text-text-muted">Belum ada data processing time</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ─── Helper Components ───────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background-alt text-text-muted">
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-muted">
            {label}
          </p>
          <p className={cn("text-[22px] font-semibold leading-tight tabular-nums", tone)}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    SUBMITTED: "Diajukan",
    VERIFIED: "Diverifikasi",
    APPROVED: "Disetujui",
    COMPLETED: "Selesai",
    REJECTED: "Ditolak",
    REVISION_REQUIRED: "Revisi",
    CANCELLED: "Dibatalkan",
  };
  return map[status] ?? status;
}
