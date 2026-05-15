"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  GraduationCap,
  PieChart as PieChartIcon,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAccessToken } from "@/lib/auth-storage";
import {
  AcademicDashboard,
  SupervisorDashboard,
  getAcademicReport,
  getSupervisorReport,
} from "@/lib/reporting-api";
import { cn } from "@/lib/cn";

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "#2563eb",
  VERIFIED: "#0891b2",
  APPROVED: "#16a34a",
  REJECTED: "#dc2626",
  COMPLETED: "#059669",
  ASSIGNED: "#4f46e5",
  ACCEPTED: "#16a34a",
};

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Diajukan",
  VERIFIED: "Diverifikasi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  COMPLETED: "Selesai",
  ASSIGNED: "Ditugaskan",
  ACCEPTED: "Diterima",
};

export default function ReportsPage() {
  return (
    <ProtectedPage
      title="Reporting Dashboard"
      description="Analitik distribusi status pengajuan layanan akademik dan dosen pembimbing."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI", "TATA_USAHA"]}
    >
      <ReportsContent />
    </ProtectedPage>
  );
}

function ReportsContent() {
  const [academic, setAcademic] = useState<AcademicDashboard | null>(null);
  const [supervisor, setSupervisor] = useState<SupervisorDashboard | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      const token = getAccessToken();
      if (!token) return;

      try {
        const [academicResponse, supervisorResponse] = await Promise.all([
          getAcademicReport(token),
          getSupervisorReport(token),
        ]);

        setAcademic(academicResponse.data ?? null);
        setSupervisor(supervisorResponse.data ?? null);
      } catch {
        // Toast is handled by ProtectedPage internals; fail silently
      } finally {
        setIsLoading(false);
      }
    }

    loadReports();
  }, []);

  return (
    <Tabs defaultValue="academic" className="space-y-5">
      <TabsList>
        <TabsTrigger value="academic">
          <BarChart3 className="size-3.5" />
          Layanan Akademik
        </TabsTrigger>
        <TabsTrigger value="supervisor">
          <GraduationCap className="size-3.5" />
          Dosen Pembimbing
        </TabsTrigger>
      </TabsList>

      <TabsContent value="academic" className="!mt-5 space-y-5">
        <AcademicSection data={academic} isLoading={isLoading} />
      </TabsContent>

      <TabsContent value="supervisor" className="!mt-5 space-y-5">
        <SupervisorSection data={supervisor} isLoading={isLoading} />
      </TabsContent>
    </Tabs>
  );
}

// ─── Academic Section ────────────────────────────────────────────────────────

function AcademicSection({
  data,
  isLoading,
}: {
  data: AcademicDashboard | null;
  isLoading: boolean;
}) {
  const total = data?.totalRequests ?? 0;

  const distribution = useMemo(
    () =>
      data
        ? [
            {
              status: "SUBMITTED",
              label: STATUS_LABELS.SUBMITTED,
              count: data.submittedRequests,
            },
            {
              status: "VERIFIED",
              label: STATUS_LABELS.VERIFIED,
              count: data.verifiedRequests,
            },
            {
              status: "APPROVED",
              label: STATUS_LABELS.APPROVED,
              count: data.approvedRequests,
            },
            {
              status: "COMPLETED",
              label: STATUS_LABELS.COMPLETED,
              count: data.completedRequests,
            },
            {
              status: "REJECTED",
              label: STATUS_LABELS.REJECTED,
              count: data.rejectedRequests,
            },
          ]
        : [],
    [data],
  );

  return (
    <>
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Pengajuan"
          value={total}
          isLoading={isLoading}
          accent="text-primary"
          icon={<Activity className="size-3.5" />}
        />
        <KpiCard
          label="Sedang Diproses"
          value={
            (data?.submittedRequests ?? 0) +
            (data?.verifiedRequests ?? 0) +
            (data?.approvedRequests ?? 0)
          }
          isLoading={isLoading}
          accent="text-info"
          icon={<TrendingUp className="size-3.5" />}
        />
        <KpiCard
          label="Selesai"
          value={data?.completedRequests ?? 0}
          isLoading={isLoading}
          accent="text-success"
          subtitle={
            total > 0
              ? `${((data!.completedRequests / total) * 100).toFixed(0)}% dari total`
              : undefined
          }
        />
        <KpiCard
          label="Ditolak"
          value={data?.rejectedRequests ?? 0}
          isLoading={isLoading}
          accent="text-danger"
          subtitle={
            total > 0
              ? `${((data!.rejectedRequests / total) * 100).toFixed(0)}% dari total`
              : undefined
          }
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4 text-text-muted" />
              Distribusi per Status
            </CardTitle>
            <p className="text-[12.5px] text-text-muted">
              Jumlah pengajuan layanan akademik berdasarkan status saat ini.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : total === 0 ? (
              <EmptyChart label="Belum ada data" />
            ) : (
              <BarChartView data={distribution} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="size-4 text-text-muted" />
              Komposisi
            </CardTitle>
            <p className="text-[12.5px] text-text-muted">
              Persentase pengajuan per status.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : total === 0 ? (
              <EmptyChart label="Belum ada data" />
            ) : (
              <PieChartView data={distribution.filter((d) => d.count > 0)} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─── Supervisor Section ──────────────────────────────────────────────────────

function SupervisorSection({
  data,
  isLoading,
}: {
  data: SupervisorDashboard | null;
  isLoading: boolean;
}) {
  const total = data?.totalRequests ?? 0;

  const distribution = useMemo(
    () =>
      data
        ? [
            {
              status: "SUBMITTED",
              label: STATUS_LABELS.SUBMITTED,
              count: data.submittedRequests,
            },
            {
              status: "VERIFIED",
              label: STATUS_LABELS.VERIFIED,
              count: data.verifiedRequests,
            },
            {
              status: "ASSIGNED",
              label: STATUS_LABELS.ASSIGNED,
              count: data.assignedRequests,
            },
            {
              status: "ACCEPTED",
              label: STATUS_LABELS.ACCEPTED,
              count: data.acceptedRequests,
            },
            {
              status: "REJECTED",
              label: STATUS_LABELS.REJECTED,
              count: data.rejectedRequests,
            },
          ]
        : [],
    [data],
  );

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Pengajuan"
          value={total}
          isLoading={isLoading}
          accent="text-primary"
          icon={<Activity className="size-3.5" />}
        />
        <KpiCard
          label="Menunggu Penetapan"
          value={(data?.submittedRequests ?? 0) + (data?.verifiedRequests ?? 0)}
          isLoading={isLoading}
          accent="text-info"
        />
        <KpiCard
          label="Diterima Dosen"
          value={data?.acceptedRequests ?? 0}
          isLoading={isLoading}
          accent="text-success"
          subtitle={
            total > 0
              ? `${((data!.acceptedRequests / total) * 100).toFixed(0)}% dari total`
              : undefined
          }
        />
        <KpiCard
          label="Ditolak Dosen"
          value={data?.rejectedRequests ?? 0}
          isLoading={isLoading}
          accent="text-danger"
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4 text-text-muted" />
              Distribusi per Status
            </CardTitle>
            <p className="text-[12.5px] text-text-muted">
              Jumlah pengajuan dosen pembimbing berdasarkan status saat ini.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : total === 0 ? (
              <EmptyChart label="Belum ada data" />
            ) : (
              <BarChartView data={distribution} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="size-4 text-text-muted" />
              Komposisi
            </CardTitle>
            <p className="text-[12.5px] text-text-muted">
              Persentase pengajuan per status.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : total === 0 ? (
              <EmptyChart label="Belum ada data" />
            ) : (
              <PieChartView data={distribution.filter((d) => d.count > 0)} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─── Charts ──────────────────────────────────────────────────────────────────

type ChartItem = { status: string; label: string; count: number };

function BarChartView({ data }: { data: ChartItem[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
              fontSize: 12,
            }}
            labelStyle={{ fontWeight: 600, color: "#0f172a" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? "#64748b"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieChartView({ data }: { data: ChartItem[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? "#64748b"}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
              fontSize: 12,
            }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 11.5, paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  isLoading,
  accent,
  subtitle,
  icon,
}: {
  label: string;
  value: number;
  isLoading: boolean;
  accent?: string;
  subtitle?: string;
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
              "mt-1.5 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-text-primary",
              accent,
            )}
          >
            {value.toLocaleString()}
          </p>
        )}
        {subtitle ? (
          <p className="mt-1.5 text-[11.5px] text-text-muted">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-[12.5px] text-text-muted">{label}</p>
    </div>
  );
}
