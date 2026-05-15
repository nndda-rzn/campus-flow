"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAccessToken } from "@/lib/auth-storage";
import {
  AcademicRequest,
  listAllAcademicRequests,
  verifyAcademicRequest,
} from "@/lib/academic-api";
import { cn } from "@/lib/cn";

const STATUS_OPTIONS = [
  { value: "SUBMITTED", label: "Menunggu" },
  { value: "VERIFIED", label: "Diverifikasi" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "", label: "Semua" },
];

export default function AdminAcademicRequestsPage() {
  return (
    <ProtectedPage
      title="Verifikasi Layanan Akademik"
      description="Tinjau dan verifikasi pengajuan layanan akademik dari mahasiswa sebelum diteruskan ke Kaprodi."
      allowedRoles={["ADMIN_PRODI", "SUPER_ADMIN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "SUBMITTED";

  const [requests, setRequests] = useState<AcademicRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Verify dialog state
  const [verifyTarget, setVerifyTarget] = useState<AcademicRequest | null>(
    null,
  );
  const [verifyNote, setVerifyNote] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  async function loadRequests(filter: string) {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    setError("");
    try {
      const res = await listAllAcademicRequests(token, filter || undefined);
      setRequests(res.data?.requests ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat daftar pengajuan",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRequests(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Filter by search query (client-side over the loaded set)
  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.requestNumber.toLowerCase().includes(q) ||
        r.serviceName.toLowerCase().includes(q),
    );
  }, [requests, searchQuery]);

  function openVerifyDialog(request: AcademicRequest) {
    setVerifyTarget(request);
    setVerifyNote("");
  }

  function closeVerifyDialog() {
    setVerifyTarget(null);
    setVerifyNote("");
  }

  async function handleVerify() {
    if (!verifyTarget) return;
    const token = getAccessToken();
    if (!token) return;

    setIsVerifying(true);
    try {
      await verifyAcademicRequest(token, {
        request_id: verifyTarget.id,
        note: verifyNote.trim(),
      });
      toast.success("Pengajuan diverifikasi", {
        description: `${verifyTarget.requestNumber} berhasil diverifikasi.`,
      });
      closeVerifyDialog();
      await loadRequests(statusFilter);
    } catch (err) {
      toast.error("Verifikasi gagal", {
        description:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memverifikasi",
      });
    } finally {
      setIsVerifying(false);
    }
  }

  // Status counts (across loaded set — for the active filter)
  const submittedCount = requests.filter(
    (r) => r.status === "SUBMITTED",
  ).length;

  return (
    <>
      <div className="space-y-4">
        {/* ── Toolbar: status tabs + search + refresh ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="overflow-x-auto">
              {STATUS_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                  {opt.value === "SUBMITTED" && submittedCount > 0 ? (
                    <span className="ml-1 rounded-full bg-info-soft px-1.5 py-0 text-[10.5px] font-semibold tabular-nums leading-tight text-info-text">
                      {submittedCount}
                    </span>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor atau judul..."
                className="h-9 w-full pl-8 sm:w-64"
              />
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => loadRequests(statusFilter)}
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw
                className={cn("size-4", isLoading && "animate-spin")}
              />
            </Button>
          </div>
        </div>

        {/* ── Table card ── */}
        <Card className="overflow-hidden">
          {error ? (
            <EmptyState
              icon={<FileText className="size-4" />}
              title="Tidak dapat memuat pengajuan"
              description={error}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadRequests(statusFilter)}
                >
                  Coba lagi
                </Button>
              }
            />
          ) : isLoading ? (
            <TableSkeleton />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-4" />}
              title={searchQuery ? "Tidak ada hasil" : "Tidak ada pengajuan"}
              description={
                searchQuery
                  ? `Tidak ditemukan pengajuan yang cocok dengan "${searchQuery}".`
                  : "Belum ada pengajuan dengan status ini."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Pengajuan</TableHead>
                  <TableHead>Layanan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-1 text-[13.5px] font-medium text-text-primary">
                        {request.title}
                      </p>
                      <p className="mt-0.5 font-mono text-[11.5px] text-text-muted">
                        {request.requestNumber}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-text-secondary">
                        {request.serviceName}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-text-muted">
                        <Clock className="size-3" />
                        {formatRelativeDate(request.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === "SUBMITTED" ? (
                        <Button
                          size="sm"
                          onClick={() => openVerifyDialog(request)}
                        >
                          <CheckCircle2 className="size-3.5" />
                          Verifikasi
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled>
                          —
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Result count footer */}
        {!isLoading && !error && filteredRequests.length > 0 ? (
          <p className="text-[12px] text-text-muted">
            Menampilkan {filteredRequests.length} pengajuan
            {searchQuery ? ` (filter: "${searchQuery}")` : ""}
          </p>
        ) : null}
      </div>

      {/* ── Verify Dialog ── */}
      <Dialog
        open={verifyTarget !== null}
        onOpenChange={(open) => !open && closeVerifyDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Pengajuan</DialogTitle>
            <DialogDescription>
              Tindakan ini akan mengubah status pengajuan menjadi{" "}
              <span className="font-medium text-text-primary">
                Diverifikasi
              </span>{" "}
              dan diteruskan ke Kaprodi untuk persetujuan.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {verifyTarget ? (
              <div className="rounded-md border border-border bg-background-alt p-3">
                <p className="font-mono text-[11.5px] text-text-muted">
                  {verifyTarget.requestNumber}
                </p>
                <p className="mt-1 text-[14px] font-medium text-text-primary">
                  {verifyTarget.title}
                </p>
                <p className="mt-1 text-[12.5px] text-text-secondary">
                  {verifyTarget.serviceName}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="verify-note">
                Catatan{" "}
                <span className="font-normal text-text-muted">(opsional)</span>
              </Label>
              <Textarea
                id="verify-note"
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                placeholder="Tambahkan catatan untuk Kaprodi..."
                className="min-h-20"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isVerifying}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={handleVerify} loading={isVerifying}>
              <CheckCircle2 className="size-3.5" />
              Verifikasi Pengajuan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div>
      <div className="border-b border-border bg-background-alt px-4 py-2">
        <Skeleton className="h-3 w-24" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
        >
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function formatRelativeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  // Server returns "2006-01-02 15:04:05" — parse manually for cross-browser safety
  const isoLike = dateStr.replace(" ", "T");
  const date = new Date(isoLike);
  if (isNaN(date.getTime())) return dateStr;

  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes}m lalu`;
  if (hours < 24) return `${hours}j lalu`;
  if (days < 7) return `${days}h lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
