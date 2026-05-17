"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  GraduationCap,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/ui/pagination";
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
  SupervisorRequest,
  listAllSupervisorRequests,
  requestRevisionSupervisorRequest,
  verifySupervisorRequest,
} from "@/lib/supervisor-api";
import { REVISION_TEMPLATES } from "@/lib/note-templates";
import { cn } from "@/lib/cn";

const STATUS_OPTIONS = [
  { value: "SUBMITTED", label: "Menunggu" },
  { value: "VERIFIED", label: "Diverifikasi" },
  { value: "ASSIGNED", label: "Ditetapkan" },
  { value: "ACCEPTED", label: "Diterima" },
  { value: "REVISION_REQUIRED", label: "Revisi" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "", label: "Semua" },
];

export default function AdminSupervisorRequestsPage() {
  return (
    <ProtectedPage
      title="Verifikasi Pengajuan Pembimbing"
      description="Tinjau dan verifikasi pengajuan dosen pembimbing dari mahasiswa sebelum diteruskan ke Kaprodi."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI"]}
    >
      <Suspense fallback={null}>
        <PageContent />
      </Suspense>
    </ProtectedPage>
  );
}

function PageContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "SUBMITTED";

  const [requests, setRequests] = useState<SupervisorRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [verifyTarget, setVerifyTarget] = useState<SupervisorRequest | null>(
    null,
  );
  const [verifyNote, setVerifyNote] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Revision dialog
  const [revisionTarget, setRevisionTarget] =
    useState<SupervisorRequest | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [revisionError, setRevisionError] = useState("");
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);

  async function loadRequests(filter: string) {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    setError("");
    try {
      const res = await listAllSupervisorRequests(token, filter || undefined);
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

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        r.topicTitle.toLowerCase().includes(q) ||
        r.requestNumber.toLowerCase().includes(q),
    );
  }, [requests, searchQuery]);

  const { currentPage, paginatedItems, setPage, goToFirst } = usePagination(
    filteredRequests,
    10,
  );

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    goToFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchQuery]);

  function openVerifyDialog(request: SupervisorRequest) {
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
      await verifySupervisorRequest(token, {
        request_id: verifyTarget.id,
        note:
          verifyNote.trim() || "Topik dan pilihan dosen sudah diverifikasi.",
      });
      toast.success("Pengajuan diverifikasi", {
        description: `${verifyTarget.requestNumber} berhasil diverifikasi dan diteruskan ke Kaprodi.`,
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

  function openRevisionDialog(request: SupervisorRequest) {
    setRevisionTarget(request);
    setRevisionNote("");
    setRevisionError("");
  }

  function closeRevisionDialog() {
    setRevisionTarget(null);
    setRevisionNote("");
    setRevisionError("");
  }

  async function handleRequestRevision() {
    if (!revisionTarget) return;
    const note = revisionNote.trim();
    if (note === "") {
      setRevisionError("Catatan revisi wajib diisi.");
      return;
    }
    if (note.length > 2000) {
      setRevisionError("Catatan maksimal 2000 karakter.");
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    setIsRequestingRevision(true);
    setRevisionError("");
    try {
      await requestRevisionSupervisorRequest(token, {
        request_id: revisionTarget.id,
        note,
      });
      toast.success("Pengajuan dikembalikan untuk revisi", {
        description: `${revisionTarget.requestNumber} dikembalikan ke mahasiswa.`,
      });
      closeRevisionDialog();
      await loadRequests(statusFilter);
    } catch (err) {
      toast.error("Gagal meminta revisi", {
        description:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memproses revisi",
      });
    } finally {
      setIsRequestingRevision(false);
    }
  }

  const submittedCount = requests.filter(
    (r) => r.status === "SUBMITTED",
  ).length;

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
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
                placeholder="Cari nomor atau topik..."
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

        {/* Table */}
        <Card className="overflow-hidden">
          {error ? (
            <EmptyState
              icon={<GraduationCap className="size-4" />}
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
                  : "Belum ada pengajuan pembimbing dengan status ini."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Topik</TableHead>
                  <TableHead>Pilihan Dosen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="max-w-xs">
                      <p className="line-clamp-1 text-[13.5px] font-medium text-text-primary">
                        {request.topicTitle}
                      </p>
                      <p className="mt-0.5 font-mono text-[11.5px] text-text-muted">
                        {request.requestNumber}
                      </p>
                    </TableCell>
                    <TableCell>
                      {request.choices.length > 0 ? (
                        <div className="space-y-0.5">
                          {request.choices.slice(0, 2).map((c) => (
                            <p
                              key={c.lecturerId}
                              className="text-[12.5px] text-text-secondary"
                            >
                              <span className="mr-1 font-mono text-[10.5px] text-text-disabled">
                                {c.priority}.
                              </span>
                              {c.lecturerName}
                            </p>
                          ))}
                          {request.choices.length > 2 ? (
                            <p className="text-[11.5px] text-text-muted">
                              +{request.choices.length - 2} lainnya
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[12.5px] text-text-disabled">
                          —
                        </span>
                      )}
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
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openRevisionDialog(request)}
                          >
                            <RotateCcw className="size-3.5" />
                            Minta Revisi
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openVerifyDialog(request)}
                          >
                            <CheckCircle2 className="size-3.5" />
                            Verifikasi
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[12.5px] text-text-disabled">
                          —
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {!isLoading && !error && filteredRequests.length > 0 ? (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredRequests.length}
            pageSize={10}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      {/* Verify Dialog */}
      <Dialog
        open={verifyTarget !== null}
        onOpenChange={(open) => !open && closeVerifyDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Pengajuan Pembimbing</DialogTitle>
            <DialogDescription>
              Tindakan ini akan mengubah status menjadi{" "}
              <span className="font-medium text-text-primary">
                Diverifikasi
              </span>{" "}
              dan diteruskan ke Kaprodi untuk penetapan dosen.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {verifyTarget ? (
              <div className="rounded-md border border-border bg-background-alt p-3 space-y-2">
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                    Nomor Pengajuan
                  </p>
                  <p className="mt-0.5 font-mono text-[12.5px] text-text-primary">
                    {verifyTarget.requestNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                    Topik
                  </p>
                  <p className="mt-0.5 text-[14px] font-medium text-text-primary">
                    {verifyTarget.topicTitle}
                  </p>
                </div>
                {verifyTarget.choices.length > 0 ? (
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                      Pilihan Dosen
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {verifyTarget.choices.map((c) => (
                        <li
                          key={c.lecturerId}
                          className="text-[12.5px] text-text-secondary"
                        >
                          <span className="font-mono text-text-disabled">
                            {c.priority}.
                          </span>{" "}
                          {c.lecturerName}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
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

      {/* Revision Dialog */}
      <Dialog
        open={revisionTarget !== null}
        onOpenChange={(open) => !open && closeRevisionDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Minta Revisi Pengajuan Pembimbing</DialogTitle>
            <DialogDescription>
              Pengajuan akan dikembalikan ke mahasiswa dengan status{" "}
              <span className="font-medium text-text-primary">
                Perlu Revisi
              </span>
              . Mahasiswa dapat memperbaiki dan mengirim ulang.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {revisionTarget ? (
              <div className="rounded-md border border-border bg-background-alt p-3">
                <p className="font-mono text-[11.5px] text-text-muted">
                  {revisionTarget.requestNumber}
                </p>
                <p className="mt-1 text-[14px] font-medium text-text-primary">
                  {revisionTarget.topicTitle}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="supervisor-revision-note">
                Catatan Revisi <span className="text-danger">*</span>
              </Label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {REVISION_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setRevisionNote(tpl);
                      if (revisionError) setRevisionError("");
                    }}
                    className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[10.5px] text-text-secondary transition-colors hover:border-accent hover:text-accent"
                    title={tpl}
                  >
                    {tpl.slice(0, 35)}…
                  </button>
                ))}
              </div>
              <Textarea
                id="supervisor-revision-note"
                value={revisionNote}
                onChange={(e) => {
                  setRevisionNote(e.target.value);
                  if (revisionError) setRevisionError("");
                }}
                placeholder="Jelaskan apa yang perlu diperbaiki mahasiswa..."
                className="min-h-24"
                aria-invalid={revisionError ? true : undefined}
                aria-describedby={
                  revisionError ? "supervisor-revision-note-error" : undefined
                }
                required
              />
              {revisionError ? (
                <p
                  id="supervisor-revision-note-error"
                  className="text-[12px] text-danger"
                >
                  {revisionError}
                </p>
              ) : (
                <p className="text-[11.5px] text-text-muted">
                  Catatan akan dikirim ke mahasiswa sebagai panduan revisi.
                </p>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isRequestingRevision}>
                Batal
              </Button>
            </DialogClose>
            <Button
              onClick={handleRequestRevision}
              loading={isRequestingRevision}
            >
              <RotateCcw className="size-3.5" />
              Minta Revisi
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
          <Skeleton className="h-3 w-40" />
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
  const isoLike = dateStr.replace(" ", "T");
  const date = new Date(isoLike);
  if (isNaN(date.getTime())) return dateStr;

  const diff = Date.now() - date.getTime();
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
