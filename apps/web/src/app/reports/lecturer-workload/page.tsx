"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { BarChart3, RefreshCw, Search, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  getLecturerWorkload,
  type LecturerWorkloadItem,
} from "@/lib/reporting-api";
import { cn } from "@/lib/cn";

export default function LecturerWorkloadReportPage() {
  return (
    <ProtectedPage
      title="Beban Dosen Pembimbing"
      description="Distribusi penetapan dosen pembimbing berdasarkan event yang sudah diproyeksikan ke reporting service."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [items, setItems] = useState<LecturerWorkloadItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await getLecturerWorkload(token);
      setItems(res.data?.items ?? []);
    } catch (err) {
      toast.error("Gagal memuat data beban dosen", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.lecturerName.toLowerCase().includes(q));
  }, [items, search]);

  const chartData = useMemo(
    () =>
      filtered
        .slice(0, 12)
        .map((it) => ({
          name: it.lecturerName || "—",
          aktif: it.activeCount,
          ditetapkan: it.assignedCount,
          diterima: it.acceptedCount,
          selesai: it.completedCount,
        })),
    [filtered],
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Total Dosen Tercatat"
          value={items.length}
          icon={<Users className="size-4" />}
        />
        <SummaryCard
          label="Total Penetapan Aktif"
          value={items.reduce((sum, it) => sum + it.activeCount, 0)}
          icon={<BarChart3 className="size-4" />}
        />
        <SummaryCard
          label="Total Selesai"
          value={items.reduce((sum, it) => sum + it.completedCount, 0)}
          icon={<BarChart3 className="size-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            Top 12 — Beban Aktif per Dosen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : chartData.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="size-4" />}
              title="Belum ada data"
              description="Belum ada penetapan dosen pembimbing yang masuk."
            />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-22}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="ditetapkan" stackId="a" fill="#94a3b8" />
                  <Bar dataKey="diterima" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="selesai" stackId="a" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama dosen..."
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
            icon={<Users className="size-4" />}
            title="Tidak ada data"
            description="Tidak ada dosen yang cocok dengan pencarian."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Dosen</TableHead>
                <TableHead className="text-right">Aktif</TableHead>
                <TableHead className="text-right">Ditetapkan</TableHead>
                <TableHead className="text-right">Diterima</TableHead>
                <TableHead className="text-right">Selesai</TableHead>
                <TableHead className="text-right">Ditolak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((it) => (
                <TableRow key={it.lecturerId}>
                  <TableCell>
                    <p className="text-[13.5px] font-medium text-text-primary">
                      {it.lecturerName || "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {it.activeCount}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {it.assignedCount}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {it.acceptedCount}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {it.completedCount}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {it.rejectedCount}
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
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
          {icon}
        </div>
        <div>
          <p className="text-[12px] text-text-muted">{label}</p>
          <p className="mt-0.5 text-[20px] font-semibold tabular-nums text-text-primary">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
