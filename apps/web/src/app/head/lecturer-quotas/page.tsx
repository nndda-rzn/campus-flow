"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { GraduationCap, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  getLecturerWorkload,
  type LecturerWorkloadItem,
} from "@/lib/reporting-api";
import {
  listAllLecturers,
  type DirectoryLecturer,
} from "@/lib/admin-api";
import { cn } from "@/lib/cn";

type Row = {
  lecturerId: string;
  lecturerUserId: string;
  lecturerName: string;
  departmentName: string;
  maxQuota: number;
  active: number;
  remaining: number;
  utilization: number; // 0..100
};

export default function LecturerQuotasPage() {
  return (
    <ProtectedPage
      title="Kuota Dosen Pembimbing"
      description="Distribusi kuota dan beban dosen pembimbing aktif. Gunakan tampilan ini sebelum menetapkan dosen baru."
      allowedRoles={["KAPRODI", "SUPER_ADMIN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [lecturers, setLecturers] = useState<DirectoryLecturer[]>([]);
  const [workload, setWorkload] = useState<LecturerWorkloadItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const [lecturersRes, workloadRes] = await Promise.all([
        listAllLecturers(token, { status: "ACTIVE" }),
        getLecturerWorkload(token),
      ]);
      setLecturers(lecturersRes.data?.lecturers ?? []);
      setWorkload(workloadRes.data?.items ?? []);
    } catch (err) {
      toast.error("Gagal memuat data kuota dosen", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo<Row[]>(() => {
    const workloadByLecturerID = new Map<string, LecturerWorkloadItem>();
    for (const w of workload) {
      workloadByLecturerID.set(w.lecturerId, w);
    }

    return lecturers.map((l) => {
      const w = workloadByLecturerID.get(l.id);
      const active = w ? w.activeCount : 0;
      const max = l.maxSupervisorQuota || 0;
      const remaining = Math.max(0, max - active);
      const utilization = max > 0 ? Math.round((active / max) * 100) : 0;
      return {
        lecturerId: l.id,
        lecturerUserId: l.userId,
        lecturerName: l.fullName,
        departmentName: l.departmentName || "—",
        maxQuota: max,
        active,
        remaining,
        utilization,
      };
    });
  }, [lecturers, workload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.lecturerName.toLowerCase().includes(q) ||
        r.departmentName.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        capacity: acc.capacity + r.maxQuota,
        active: acc.active + r.active,
        full:
          acc.full + (r.maxQuota > 0 && r.active >= r.maxQuota ? 1 : 0),
      }),
      { capacity: 0, active: 0, full: 0 },
    );
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Kapasitas Total" value={totals.capacity} />
        <SummaryCard label="Beban Aktif" value={totals.active} />
        <SummaryCard
          label="Dosen Penuh"
          value={totals.full}
          warningWhenAny
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau prodi..."
            className="h-9 pl-8"
          />
        </div>
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
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="size-4" />}
            title="Belum ada data dosen"
            description="Tambahkan dosen di /admin/lecturers atau atur kuota mereka terlebih dahulu."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Dosen</TableHead>
                <TableHead>Program Studi</TableHead>
                <TableHead className="text-right">Kapasitas</TableHead>
                <TableHead className="text-right">Aktif</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
                <TableHead className="min-w-[160px]">Utilisasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.lecturerId}>
                  <TableCell>
                    <p className="text-[13.5px] font-medium text-text-primary">
                      {r.lecturerName}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] text-text-secondary">
                      {r.departmentName}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {r.maxQuota}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {r.active}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.maxQuota === 0 ? (
                      <span className="text-[12px] text-text-disabled">
                        belum diatur
                      </span>
                    ) : r.remaining === 0 ? (
                      <Badge variant="danger">Penuh</Badge>
                    ) : r.remaining <= 2 ? (
                      <Badge variant="warning">{r.remaining} slot</Badge>
                    ) : (
                      <span className="font-mono text-text-secondary">
                        {r.remaining}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1.5 flex-1 rounded-full bg-background-alt"
                        aria-hidden
                      >
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            r.utilization >= 100 && "bg-danger",
                            r.utilization < 100 &&
                              r.utilization >= 80 &&
                              "bg-warning",
                            r.utilization < 80 && "bg-success",
                          )}
                          style={{
                            width: `${Math.min(100, r.utilization)}%`,
                          }}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-right font-mono text-[12px] text-text-secondary tabular-nums">
                        {r.utilization}%
                      </span>
                    </div>
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

function SummaryCard({
  label,
  value,
  warningWhenAny,
}: {
  label: string;
  value: number;
  warningWhenAny?: boolean;
}) {
  const isWarning = warningWhenAny && value > 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[12px] font-medium uppercase tracking-[0.14em] text-text-muted">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "font-display text-[28px] font-semibold tabular-nums",
            isWarning ? "text-warning-text" : "text-text-primary",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
