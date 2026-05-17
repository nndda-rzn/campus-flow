"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Download,
  FileText,
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
  AcademicRequest,
  listAllAcademicRequests,
  requestRevisionAcademicRequest,
  verifyAcademicRequest,
} from "@/lib/academic-api";
import { bulkVerifyAcademicRequests } from "@/lib/comment-bulk-api";
import { FileSection } from "@/components/academic/file-section";
import { RequestTimeline } from "@/components/academic/request-timeline";
import { SLABadge } from "@/components/academic/sla-badge";
import { CommentThread } from "@/components/academic/comment-thread";
import { REVISION_TEMPLATES } from "@/lib/note-templates";
import { cn } from "@/lib/cn";

const STATUS_OPTIONS = [
  { value: "SUBMITTED", label: "Menunggu" },
  { value: "VERIFIED", label: "Diverifikasi" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "REVISION_REQUIRED", label: "Revisi" },
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
      <Suspense fallback={null}>
        <PageContent />
      </Suspense>
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

  // Expand row state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Bulk selection (FR-255)
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const [bulkNote, setBulkNote] = useState("");
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);

  function toggleSelected(id: string) {
    setSelectedIDs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIDs(new Set());
    setBulkNote("");
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // Verify dialog state
  const [verifyTarget, setVerifyTarget] = useState<AcademicRequest | null>(
    null,
  );
  const [verifyNote, setVerifyNote] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Revision dialog state
  const [revisionTarget, setRevisionTarget] =
    useState<AcademicRequest | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [revisionError, setRevisionError] = useState("");
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);

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

  const { currentPage, paginatedItems, setPage, goToFirst } = usePagination(
    filteredRequests,
    10,
  );

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    goToFirst();
    clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchQuery]);

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

  function openRevisionDialog(request: AcademicRequest) {
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
      await requestRevisionAcademicRequest(token, {
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

  async function handleBulkVerify() {
    if (selectedIDs.size === 0) return;
    const token = getAccessToken();
    if (!token) return;

    const ids = Array.from(selectedIDs);
    setIsBulkVerifying(true);
    try {
      const res = await bulkVerifyAcademicRequests(token, {
        request_ids: ids,
        note: bulkNote.trim(),
      });
      const succeeded = res.data?.succeeded ?? 0;
      const failed = res.data?.failed ?? 0;

      if (failed === 0) {
        toast.success(`${succeeded} pengajuan diverifikasi`, {
          description: "Semua berhasil diteruskan ke Kaprodi.",
        });
      } else {
        toast.warning(`${succeeded} berhasil, ${failed} gagal`, {
          description: "Beberapa pengajuan tidak bisa diverifikasi. Cek alasan di hasil.",
        });
      }
      clearSelection();
      await loadRequests(statusFilter);
    } catch (err) {
      toast.error("Gagal bulk verifikasi", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsBulkVerifying(false);
    }
  }

  function handleExportCSV() {
    const params = new URLSearchParams();
    const status = statusFilter ? statusFilter : "";
    if (status) params.set("status", status);

    // Direct link export — browser akan trigger download via Content-Disposition.
    const token = getAccessToken();
    if (!token) {
      toast.error("Sesi habis");
      return;
    }
    const baseURL =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
    const url = `${baseURL}/api/v1/reports/academic-requests?format=csv${params.toString() ? `&${params.toString()}` : ""}`;
    // CSV endpoint requires Authorization header — fetch with header & save Blob.
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (resp) => {
        if (!resp.ok) {
          throw new Error(`Export gagal (${resp.status})`);
        }
        const blob = await resp.blob();
        const objectURL = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectURL;
        a.download = `academic-requests-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectURL);
        toast.success("Export CSV siap diunduh");
      })
      .catch((err) => {
        toast.error("Gagal export CSV", {
          description: err instanceof Error ? err.message : undefined,
        });
      });
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
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              title="Export CSV"
            >
              <Download className="size-3.5" />
              CSV
            </Button>
          </div>
        </div>

        {selectedIDs.size > 0 && (
          <div className="flex flex-col gap-3 rounded-md border border-accent bg-accent-soft p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-[13px] font-medium text-accent">
                {selectedIDs.size} pengajuan dipilih
              </p>
              <Input
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                placeholder="Catatan opsional untuk Kaprodi…"
                className="h-8 sm:w-72"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={clearSelection}
                disabled={isBulkVerifying}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleBulkVerify}
                loading={isBulkVerifying}
              >
                <CheckCircle2 className="size-3.5" />
                Verifikasi {selectedIDs.size}
              </Button>
            </div>
          </div>
        )}

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
                  <TableHead className="w-9 px-3">
                    <span className="sr-only">Pilih</span>
                  </TableHead>
                  <TableHead>Pengajuan</TableHead>
                  <TableHead>Layanan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((request) => (
                  <Fragment key={request.id}>
                    <TableRow>
                      <TableCell className="w-9 px-3">
                        {request.status === "SUBMITTED" ? (
                          <input
                            type="checkbox"
                            aria-label={`Pilih ${request.requestNumber}`}
                            checked={selectedIDs.has(request.id)}
                            onChange={() => toggleSelected(request.id)}
                            className="size-4 cursor-pointer rounded border-border"
                          />
                        ) : null}
                      </TableCell>
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
                        {request.dueAt && (
                          <div className="mt-1">
                            <SLABadge
                              dueAt={request.dueAt}
                              status={request.status}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleExpand(request.id)}
                            aria-label={
                              expandedId === request.id
                                ? "Tutup detail"
                                : "Lihat detail"
                            }
                            title={
                              expandedId === request.id
                                ? "Tutup detail"
                                : "Lihat detail"
                            }
                          >
                            {expandedId === request.id ? (
                              <ChevronUp className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )}
                            Detail
                          </Button>
                          {request.status === "SUBMITTED" ? (
                            <>
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
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" disabled>
                              —
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedId === request.id && (
                      <TableRow className="bg-background-alt hover:bg-background-alt">
                        <TableCell colSpan={6} className="px-5 py-4">
                          <div className="space-y-4">
                            <div>
                              <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                                Deskripsi
                              </p>
                              <p className="text-[13px] leading-relaxed text-text-secondary">
                                {request.description?.trim()
                                  ? request.description
                                  : "Tidak ada deskripsi"}
                              </p>
                            </div>
                            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                              <div>
                                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                                  File Terlampir
                                </p>
                                <FileSection
                                  requestId={request.id}
                                  token={getAccessToken() ?? ""}
                                />
                              </div>
                              <div>
                                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                                  Timeline
                                </p>
                                <RequestTimeline
                                  token={getAccessToken() ?? ""}
                                  requestId={request.id}
                                />
                              </div>
                            </div>
                            <div>
                              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                                Diskusi
                              </p>
                              <CommentThread
                                requestType="ACADEMIC"
                                requestId={request.id}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Result count footer */}
        {!isLoading && !error && filteredRequests.length > 0 ? (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredRequests.length}
            pageSize={10}
            onPageChange={setPage}
          />
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

      {/* ── Revision Dialog ── */}
      <Dialog
        open={revisionTarget !== null}
        onOpenChange={(open) => !open && closeRevisionDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Minta Revisi Pengajuan</DialogTitle>
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
                  {revisionTarget.title}
                </p>
                <p className="mt-1 text-[12.5px] text-text-secondary">
                  {revisionTarget.serviceName}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="revision-note">
                Catatan Revisi{" "}
                <span className="text-danger">*</span>
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
                id="revision-note"
                value={revisionNote}
                onChange={(e) => {
                  setRevisionNote(e.target.value);
                  if (revisionError) setRevisionError("");
                }}
                placeholder="Jelaskan apa yang perlu diperbaiki mahasiswa..."
                className="min-h-24"
                aria-invalid={revisionError ? true : undefined}
                aria-describedby={
                  revisionError ? "revision-note-error" : undefined
                }
                required
              />
              {revisionError ? (
                <p
                  id="revision-note-error"
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
