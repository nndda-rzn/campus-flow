"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
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
import { Checkbox } from "@/components/ui/checkbox";
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
  approveAcademicRequest,
  bulkApproveAcademicRequests,
  bulkRejectAcademicRequests,
  listAllAcademicRequests,
  rejectAcademicRequest,
} from "@/lib/academic-api";
import { BulkActionBar } from "@/components/kaprodi/bulk-action-bar";
import { BulkConfirmDialog } from "@/components/kaprodi/bulk-confirm-dialog";
import {
  BulkProgressDialog,
  type BulkProgressItem,
} from "@/components/kaprodi/bulk-progress-dialog";
import { cn } from "@/lib/cn";

const STATUS_OPTIONS = [
  { value: "VERIFIED", label: "Menunggu Keputusan" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "", label: "Semua" },
];

type ActionType = "approve" | "reject";

export default function HeadAcademicRequestsPage() {
  return (
    <ProtectedPage
      title="Approval Layanan Akademik"
      description="Setujui atau tolak pengajuan yang sudah diverifikasi oleh Admin Prodi."
      allowedRoles={["KAPRODI", "SUPER_ADMIN"]}
    >
      <Suspense fallback={null}>
        <PageContent />
      </Suspense>
    </ProtectedPage>
  );
}

function PageContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "VERIFIED";

  const [requests, setRequests] = useState<AcademicRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Action dialog state
  const [actionTarget, setActionTarget] = useState<{
    type: ActionType;
    request: AcademicRequest;
  } | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Bulk selection state
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const [bulkNote, setBulkNote] = useState("");
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [progressItems, setProgressItems] = useState<BulkProgressItem[]>([]);
  const [showProgress, setShowProgress] = useState(false);

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
    setSelectedIDs(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchQuery]);

  // ─── Bulk selection helpers ────────────────────────────────────────────────

  const verifiedRequests = useMemo(
    () => filteredRequests.filter((r) => r.status === "VERIFIED"),
    [filteredRequests],
  );

  function toggleSelected(id: string) {
    setSelectedIDs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIDs.size === verifiedRequests.length && selectedIDs.size > 0) {
      setSelectedIDs(new Set());
    } else {
      setSelectedIDs(new Set(verifiedRequests.map((r) => r.id)));
    }
  }

  function clearSelection() {
    setSelectedIDs(new Set());
    setBulkNote("");
    setBulkAction(null);
  }

  function openBulkConfirm(action: "approve" | "reject") {
    setBulkAction(action);
  }

  async function handleBulkConfirm() {
    if (selectedIDs.size === 0 || !bulkAction) return;
    const token = getAccessToken();
    if (!token) return;

    const ids = Array.from(selectedIDs);

    // Build progress items
    const items: BulkProgressItem[] = ids.map((id) => {
      const req = requests.find((r) => r.id === id);
      return {
        id,
        requestNumber: req?.requestNumber ?? id.slice(0, 8),
        status: "pending" as const,
      };
    });
    setProgressItems(items);
    setShowProgress(true);
    setBulkAction(null);
    setIsBulkProcessing(true);

    try {
      // Mark all as processing
      setProgressItems((prev) =>
        prev.map((p) => ({ ...p, status: "processing" as const })),
      );

      let res;
      if (bulkAction === "approve") {
        res = await bulkApproveAcademicRequests(token, {
          request_ids: ids,
          note: bulkNote.trim() || undefined,
        });
      } else {
        res = await bulkRejectAcademicRequests(token, {
          request_ids: ids,
          note: bulkNote.trim(),
        });
      }

      // Update progress items with results
      const results = res.data?.results ?? [];
      setProgressItems((prev) =>
        prev.map((p) => {
          const result = results.find((r) => r.request_id === p.id);
          if (result) {
            return {
              ...p,
              status: result.success ? ("success" as const) : ("error" as const),
              error: result.error || undefined,
            };
          }
          return { ...p, status: "success" as const };
        }),
      );

      const succeeded = res.data?.succeeded ?? 0;
      const failed = res.data?.failed ?? 0;

      if (failed === 0) {
        toast.success(
          `${succeeded} pengajuan ${bulkAction === "approve" ? "disetujui" : "ditolak"}`,
          {
            description:
              bulkAction === "approve"
                ? "Semua berhasil diteruskan ke Tata Usaha."
                : "Semua dikembalikan ke mahasiswa.",
          },
        );
      } else {
        toast.warning(`${succeeded} berhasil, ${failed} gagal`, {
          description: "Beberapa pengajuan tidak bisa diproses.",
        });
      }
    } catch (err) {
      setProgressItems((prev) =>
        prev.map((p) => ({
          ...p,
          status: "error" as const,
          error: err instanceof Error ? err.message : "Unknown error",
        })),
      );
      toast.error("Gagal memproses bulk operation", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsBulkProcessing(false);
    }
  }

  function handleProgressClose() {
    setShowProgress(false);
    setProgressItems([]);
    clearSelection();
    loadRequests(statusFilter);
  }

  function openActionDialog(type: ActionType, request: AcademicRequest) {
    setActionTarget({ type, request });
    setActionNote("");
  }

  function closeActionDialog() {
    setActionTarget(null);
    setActionNote("");
  }

  async function handleAction() {
    if (!actionTarget) return;
    const token = getAccessToken();
    if (!token) return;

    const note = actionNote.trim();

    if (actionTarget.type === "reject" && !note) {
      toast.error("Catatan wajib diisi", {
        description: "Sertakan alasan penolakan agar mahasiswa dapat merevisi.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      if (actionTarget.type === "approve") {
        await approveAcademicRequest(token, {
          request_id: actionTarget.request.id,
          note: note || "Pengajuan disetujui oleh Kaprodi.",
        });
        toast.success("Pengajuan disetujui", {
          description: `${actionTarget.request.requestNumber} diteruskan ke Tata Usaha.`,
        });
      } else {
        await rejectAcademicRequest(token, {
          request_id: actionTarget.request.id,
          note,
        });
        toast.success("Pengajuan ditolak", {
          description: `${actionTarget.request.requestNumber} dikembalikan ke mahasiswa.`,
        });
      }
      closeActionDialog();
      await loadRequests(statusFilter);
    } catch (err) {
      toast.error("Gagal memproses", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  const verifiedCount = requests.filter((r) => r.status === "VERIFIED").length;

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
                  {opt.value === "VERIFIED" && verifiedCount > 0 ? (
                    <span className="ml-1 rounded-full bg-warning-soft px-1.5 py-0 text-[10.5px] font-semibold tabular-nums leading-tight text-warning-text">
                      {verifiedCount}
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
            >
              <RefreshCw
                className={cn("size-4", isLoading && "animate-spin")}
              />
            </Button>
          </div>
        </div>

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
                  <TableHead className="w-10 px-3">
                    {statusFilter === "VERIFIED" && verifiedRequests.length > 0 ? (
                      <Checkbox
                        checked={
                          selectedIDs.size === verifiedRequests.length && selectedIDs.size > 0
                            ? true
                            : selectedIDs.size > 0
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={toggleSelectAll}
                        aria-label="Pilih semua"
                      />
                    ) : null}
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
                  <TableRow
                    key={request.id}
                    className={cn(
                      selectedIDs.has(request.id) && "bg-primary/5",
                    )}
                  >
                    <TableCell className="w-10 px-3">
                      {request.status === "VERIFIED" ? (
                        <Checkbox
                          checked={selectedIDs.has(request.id)}
                          onCheckedChange={() => toggleSelected(request.id)}
                          aria-label={`Pilih ${request.requestNumber}`}
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
                        {formatRelative(request.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === "VERIFIED" ? (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => openActionDialog("approve", request)}
                          >
                            <CheckCircle2 className="size-3.5" />
                            Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openActionDialog("reject", request)}
                          >
                            <XCircle className="size-3.5" />
                            Tolak
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

      {/* Action Dialog */}
      <Dialog
        open={actionTarget !== null}
        onOpenChange={(open) => !open && closeActionDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionTarget?.type === "approve" ? (
                <>
                  <ShieldCheck className="size-4 text-success" />
                  Setujui Pengajuan
                </>
              ) : (
                <>
                  <XCircle className="size-4 text-danger" />
                  Tolak Pengajuan
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionTarget?.type === "approve"
                ? "Pengajuan akan diteruskan ke Tata Usaha untuk diproses."
                : "Pengajuan akan dikembalikan ke mahasiswa beserta catatan alasan."}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {actionTarget ? (
              <div className="rounded-md border border-border bg-background-alt p-3">
                <p className="font-mono text-[11.5px] text-text-muted">
                  {actionTarget.request.requestNumber}
                </p>
                <p className="mt-1 text-[14px] font-medium text-text-primary">
                  {actionTarget.request.title}
                </p>
                <p className="mt-1 text-[12.5px] text-text-secondary">
                  {actionTarget.request.serviceName}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="action-note">
                Catatan{" "}
                {actionTarget?.type === "reject" ? (
                  <span className="font-normal text-danger">(wajib)</span>
                ) : (
                  <span className="font-normal text-text-muted">
                    (opsional)
                  </span>
                )}
              </Label>
              <Textarea
                id="action-note"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={
                  actionTarget?.type === "approve"
                    ? "Catatan tambahan untuk Tata Usaha..."
                    : "Jelaskan alasan penolakan agar mahasiswa dapat merevisi..."
                }
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isProcessing}>
                Batal
              </Button>
            </DialogClose>
            {actionTarget?.type === "approve" ? (
              <Button
                variant="success"
                onClick={handleAction}
                loading={isProcessing}
              >
                <CheckCircle2 className="size-3.5" />
                Setujui
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={handleAction}
                loading={isProcessing}
              >
                <XCircle className="size-3.5" />
                Tolak Pengajuan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Bar (floating) */}
      <BulkActionBar
        selectedCount={selectedIDs.size}
        note={bulkNote}
        onNoteChange={setBulkNote}
        onApprove={() => openBulkConfirm("approve")}
        onReject={() => openBulkConfirm("reject")}
        onClear={clearSelection}
        isProcessing={isBulkProcessing}
      />

      {/* Bulk Confirm Dialog */}
      <BulkConfirmDialog
        open={bulkAction !== null}
        onOpenChange={(open) => !open && setBulkAction(null)}
        action={bulkAction ?? "approve"}
        items={Array.from(selectedIDs).map((id) => {
          const req = requests.find((r) => r.id === id);
          return {
            id,
            requestNumber: req?.requestNumber ?? "",
            title: req?.title ?? "",
            serviceName: req?.serviceName ?? "",
          };
        })}
        note={bulkNote}
        onNoteChange={setBulkNote}
        onConfirm={handleBulkConfirm}
        isProcessing={isBulkProcessing}
      />

      {/* Bulk Progress Dialog */}
      <BulkProgressDialog
        open={showProgress}
        onOpenChange={(open) => !open && handleProgressClose()}
        action={bulkAction ?? "approve"}
        items={progressItems}
        onClose={handleProgressClose}
      />
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
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

function formatRelative(dateStr: string | undefined | null): string {
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

  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
