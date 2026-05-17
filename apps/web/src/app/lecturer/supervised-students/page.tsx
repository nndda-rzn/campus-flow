"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { GraduationCap, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
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
  SupervisorRequest,
  listLecturerSupervisorRequests,
} from "@/lib/supervisor-api";
import { cn } from "@/lib/cn";

// Active = sudah diterima dosen, baik COMPLETED maupun ACCEPTED.
const ACTIVE_STATUSES = new Set(["ACCEPTED", "COMPLETED"]);

export default function LecturerSupervisedStudentsPage() {
  return (
    <ProtectedPage
      title="Mahasiswa Bimbingan"
      description="Daftar mahasiswa yang sudah Anda terima sebagai pembimbing."
      allowedRoles={["DOSEN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [requests, setRequests] = useState<SupervisorRequest[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await listLecturerSupervisorRequests(token);
      setRequests(res.data?.requests ?? []);
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
  }, []);

  const supervised = useMemo(
    () => requests.filter((r) => ACTIVE_STATUSES.has(r.status)),
    [requests],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return supervised;
    return supervised.filter(
      (r) =>
        r.topicTitle.toLowerCase().includes(q) ||
        r.requestNumber.toLowerCase().includes(q),
    );
  }, [supervised, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari topik atau nomor pengajuan..."
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
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
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
                <TableHead>Topik</TableHead>
                <TableHead>Nomor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Diperbarui</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-1 text-[13.5px] font-medium text-text-primary">
                      {r.topicTitle}
                    </p>
                    {r.topicDescription ? (
                      <p className="mt-0.5 line-clamp-2 text-[12px] text-text-muted">
                        {r.topicDescription}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[12px] text-text-secondary">
                      {r.requestNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-[12.5px] text-text-muted">
                      {formatDate(r.updatedAt)}
                    </span>
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

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  const isoLike = dateStr.replace(" ", "T");
  const date = new Date(isoLike);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
