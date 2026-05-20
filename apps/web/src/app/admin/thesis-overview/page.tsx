"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import {
  getThesisOverview,
  type ThesisOverviewItem,
  type ThesisOverviewData,
} from "@/lib/thesis-overview-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

export default function AdminThesisOverviewPage() {
  return (
    <ProtectedPage
      title="Progress Skripsi Mahasiswa"
      description="Pantau progress skripsi seluruh mahasiswa di program studi."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI"]}
    >
      <ThesisOverviewContent />
    </ProtectedPage>
  );
}

function ThesisOverviewContent() {
  const [data, setData] = useState<ThesisOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stuckOnly, setStuckOnly] = useState(false);

  async function loadData() {
    setIsLoading(true);
    try {
      const result = await getThesisOverview({
        stuck_only: stuckOnly,
        search: search || undefined,
      });
      setData(result);
    } catch (err) {
      toast.error("Gagal memuat data", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stuckOnly]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadData();
  }

  const students = data?.students ?? [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Mahasiswa"
          value={data?.total ?? 0}
          icon={<Users className="size-4" />}
          tone="neutral"
          isLoading={isLoading}
        />
        <SummaryCard
          label="On Track"
          value={data?.on_track ?? 0}
          icon={<CheckCircle2 className="size-4" />}
          tone="success"
          isLoading={isLoading}
        />
        <SummaryCard
          label="Terlambat"
          value={data?.behind ?? 0}
          icon={<AlertTriangle className="size-4" />}
          tone="warning"
          isLoading={isLoading}
        />
        <SummaryCard
          label="Belum Mulai"
          value={data?.not_started ?? 0}
          icon={<Clock className="size-4" />}
          tone="danger"
          isLoading={isLoading}
        />
      </section>

      {/* Filters */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-4">
          <CardTitle className="text-sm">Daftar Mahasiswa</CardTitle>
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau NIM..."
                  className="pl-8 w-[220px] h-8 text-sm"
                />
              </div>
              <Button type="submit" size="sm" variant="outline">
                Cari
              </Button>
            </form>
            <Button
              size="sm"
              variant={stuckOnly ? "primary" : "outline"}
              onClick={() => setStuckOnly(!stuckOnly)}
            >
              <AlertTriangle className="size-3.5 mr-1" />
              Hanya yang macet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="size-5" />}
              title="Tidak ada data"
              description={
                stuckOnly
                  ? "Tidak ada mahasiswa yang macet. Semua on track!"
                  : "Belum ada mahasiswa dengan dosen pembimbing yang diterima."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mahasiswa</TableHead>
                  <TableHead>Topik</TableHead>
                  <TableHead>Dosen Pembimbing</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead className="w-[120px]">Progress</TableHead>
                  <TableHead className="text-center w-[100px]">Hari Idle</TableHead>
                  <TableHead className="text-center w-[80px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <StudentRow key={student.student_user_id} student={student} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StudentRow({ student }: { student: ThesisOverviewItem }) {
  return (
    <TableRow>
      <TableCell>
        <p className="font-medium text-sm">{student.student_name}</p>
        <p className="text-xs text-muted-foreground">{student.nim}</p>
      </TableCell>
      <TableCell className="max-w-[180px]">
        <p className="text-sm truncate">{student.topic_title}</p>
      </TableCell>
      <TableCell className="text-sm">{student.lecturer_name}</TableCell>
      <TableCell className="text-sm">{student.current_milestone}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                student.completion_percentage >= 75
                  ? "bg-green-500"
                  : student.completion_percentage >= 40
                    ? "bg-amber-500"
                    : "bg-red-400",
              )}
              style={{ width: `${student.completion_percentage}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums w-[32px] text-right">
            {student.completion_percentage}%
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <span
          className={cn(
            "text-xs font-medium",
            student.days_since_last_activity > 14
              ? "text-red-600"
              : student.days_since_last_activity > 7
                ? "text-amber-600"
                : "text-green-600",
          )}
        >
          {student.days_since_last_activity} hari
        </span>
      </TableCell>
      <TableCell className="text-center">
        {student.is_stuck ? (
          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
            Macet
          </span>
        ) : student.completion_percentage === 0 ? (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
            Belum
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
            Aktif
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
  isLoading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "success" | "warning" | "danger" | "neutral";
  isLoading: boolean;
}) {
  const toneStyles = {
    success: "bg-green-50 text-green-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
    neutral: "bg-gray-50 text-gray-600",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <span className={cn("flex size-8 items-center justify-center rounded-md", toneStyles[tone])}>
            {icon}
          </span>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
        </div>
        <div className="mt-2">
          {isLoading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p className="text-[24px] font-semibold leading-none tabular-nums">
              {value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
