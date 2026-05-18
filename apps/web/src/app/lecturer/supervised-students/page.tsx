"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, RefreshCw, Search, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
  SupervisedStudentProgress,
  listSupervisedProgress,
} from "@/lib/thesis-api";
import { cn } from "@/lib/cn";

export default function LecturerSupervisedStudentsPage() {
  return (
    <ProtectedPage
      title="Mahasiswa Bimbingan"
      description="Daftar mahasiswa yang sudah Anda terima sebagai pembimbing beserta progress skripsi."
      allowedRoles={["DOSEN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const router = useRouter();
  const [students, setStudents] = useState<SupervisedStudentProgress[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [includeCompleted, setIncludeCompleted] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await listSupervisedProgress(token, { includeCompleted });
      setStudents(res.data?.items ?? []);
    } catch (err) {
      toast.error("Gagal memuat data bimbingan", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeCompleted]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.topicTitle.toLowerCase().includes(q) ||
        s.studentName.toLowerCase().includes(q) ||
        s.studentNim.toLowerCase().includes(q),
    );
  }, [students, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, NIM, atau topik..."
            className="h-9 pl-8"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={includeCompleted}
            onChange={(e) => setIncludeCompleted(e.target.checked)}
            className="rounded border-border-default"
          />
          Tampilkan selesai
        </label>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => load()}
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="size-4" />}
            title="Belum ada mahasiswa bimbingan"
            description="Mahasiswa yang Anda terima akan muncul di sini setelah Anda menerima penetapan."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Mahasiswa</TableHead>
                <TableHead>Topik</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Aktivitas Terakhir</TableHead>
                <TableHead className="w-[80px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.studentUserId}>
                  <TableCell>
                    <p className="text-[13.5px] font-medium text-text-primary">
                      {s.studentName}
                    </p>
                    <p className="text-[12px] font-mono text-text-muted">
                      {s.studentNim}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="line-clamp-2 text-[13px] text-text-secondary">
                      {s.topicTitle}
                    </p>
                  </TableCell>
                  <TableCell>
                    <ProgressIndicator
                      completed={s.completedMilestones}
                      total={s.totalMilestones}
                    />
                  </TableCell>
                  <TableCell>
                    <LastActivityBadge
                      lastActivityAt={s.lastActivityAt}
                      daysSince={s.daysSinceLastActivity}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/lecturer/supervised-students/${s.studentUserId}`
                        )
                      }
                      title="Lihat Detail"
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function ProgressIndicator({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = completed === total && total > 0;

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-bg-subtle">
        <div
          className={cn(
            "h-full transition-all",
            isComplete ? "bg-status-success" : "bg-accent-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[12px] text-text-muted">
        {completed}/{total}
      </span>
    </div>
  );
}

function LastActivityBadge({
  lastActivityAt,
  daysSince,
}: {
  lastActivityAt?: string;
  daysSince: number;
}) {
  if (!lastActivityAt) {
    return <span className="text-[12px] text-text-muted">—</span>;
  }

  const isStuck = daysSince > 14;

  return (
    <div className="flex items-center gap-1.5">
      {isStuck && (
        <AlertTriangle className="size-3.5 text-status-warning" />
      )}
      <span
        className={cn(
          "text-[12px]",
          isStuck ? "text-status-warning font-medium" : "text-text-muted"
        )}
      >
        {daysSince === 0
          ? "Hari ini"
          : daysSince === 1
            ? "Kemarin"
            : `${daysSince} hari lalu`}
      </span>
    </div>
  );
}
