"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  FileCheck,
  Inbox,
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
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileSection } from "@/components/academic/file-section";
import { getAccessToken } from "@/lib/auth-storage";
import {
  AcademicRequest,
  completeAcademicRequest,
  listAllAcademicRequests,
} from "@/lib/academic-api";
import { cn } from "@/lib/cn";

const STATUS_OPTIONS = [
  { value: "APPROVED", label: "Siap Diproses" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "VERIFIED", label: "Diverifikasi" },
  { value: "SUBMITTED", label: "Diajukan" },
  { value: "", label: "Semua" },
];

export default function StaffAcademicRequestsPage() {
  return (
    <ProtectedPage
      title="Pengajuan Akademik"
      description="Upload dokumen final dan tandai pengajuan sebagai selesai setelah dokumen siap."
      allowedRoles={["TATA_USAHA", "SUPER_ADMIN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [requests, setRequests] = useState<AcademicRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("APPROVED");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Complete dialog state
  const [completeTarget, setCompleteTarget] = useState<AcademicRequest | null>(
    null,
  );
  const [completeNote, setCompleteNote] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  async function loadRequests(filter: string) {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await listAllAcademicRequests(token, filter || undefined);
      setRequests(res.data?.requests ?? []);
    } catch (err) {
      toast.error("Gagal memuat pengajuan", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
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
        r.requestNumber.toLowerCase().includes(q),
    );
  }, [requests, searchQuery]);

  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function openCompleteDialog(request: AcademicRequest) {
    setCompleteTarget(request);
    setCompleteNote("");
  }

  function closeCompleteDialog() {
    setCompleteTarget(null);
    setCompleteNote("");
  }

  async function handleComplete() {
    if (!completeTarget) return;
    const token = getAccessToken();
    if (!token) return;

    setIsCompleting(true);
    try {
      await completeAcademicRequest(token, {
        request_id: completeTarget.id,
        note: completeNote.trim(),
      });
      toast.success("Pengajuan selesai", {
        description: `${completeTarget.requestNumber} telah ditandai selesai dan mahasiswa diberitahu.`,
      });
      closeCompleteDialog();
      setExpandedId(null);
      await loadRequests(statusFilter);
    } catch (err) {
      toast.error("Gagal menyelesaikan", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsCompleting(false);
    }
  }

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
                  {opt.value === "APPROVED" && approvedCount > 0 ? (
                    <span className="ml-1 rounded-full bg-success-soft px-1.5 py-0 text-[10.5px] font-semibold tabular-nums leading-tight text-success-text">
                      {approvedCount}
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
                placeholder="Cari pengajuan..."
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

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Inbox className="size-4" />}
              title={
                searchQuery
                  ? "Tidak ada hasil"
                  : statusFilter === "APPROVED"
                    ? "Tidak ada pengajuan siap proses"
                    : "Tidak ada pengajuan"
              }
              description={
                searchQuery
                  ? `Tidak ditemukan pengajuan yang cocok dengan "${searchQuery}".`
                  : statusFilter === "APPROVED"
                    ? "Pengajuan yang sudah disetujui Kaprodi akan muncul di sini."
                    : "Belum ada pengajuan dengan status ini."
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border">
              {filteredRequests.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  isExpanded={expandedId === request.id}
                  onToggle={() => toggleExpand(request.id)}
                  onComplete={() => openCompleteDialog(request)}
                />
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Complete dialog */}
      <Dialog
        open={completeTarget !== null}
        onOpenChange={(open) => !open && closeCompleteDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="size-4 text-success" />
              Tandai Selesai
            </DialogTitle>
            <DialogDescription>
              Pastikan dokumen final sudah di-upload sebelum menandai selesai.
              Mahasiswa akan menerima notifikasi.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {completeTarget ? (
              <div className="rounded-md border border-border bg-background-alt p-3">
                <p className="font-mono text-[11.5px] text-text-muted">
                  {completeTarget.requestNumber}
                </p>
                <p className="mt-1 text-[14px] font-medium text-text-primary">
                  {completeTarget.title}
                </p>
                <p className="mt-1 text-[12.5px] text-text-secondary">
                  {completeTarget.serviceName}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="complete-note">
                Catatan{" "}
                <span className="font-normal text-text-muted">(opsional)</span>
              </Label>
              <Textarea
                id="complete-note"
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
                placeholder="Catatan untuk mahasiswa, misal lokasi pengambilan dokumen fisik..."
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isCompleting}>
                Batal
              </Button>
            </DialogClose>
            <Button
              variant="success"
              onClick={handleComplete}
              loading={isCompleting}
            >
              <CheckCircle2 className="size-3.5" />
              Tandai Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Request Row ─────────────────────────────────────────────────────────────

function RequestRow({
  request,
  isExpanded,
  onToggle,
  onComplete,
}: {
  request: AcademicRequest;
  isExpanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
}) {
  const token = getAccessToken() ?? "";

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-background-alt"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="line-clamp-1 text-[13.5px] font-medium text-text-primary">
              {request.title}
            </p>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-text-muted">
            <span className="font-mono">{request.requestNumber}</span>
            <span className="text-text-disabled">·</span>
            <span>{request.serviceName}</span>
            <span className="text-text-disabled">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {formatRelative(request.createdAt)}
            </span>
          </p>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-text-muted transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      {isExpanded ? (
        <div className="border-t border-border bg-background-alt px-5 py-4 space-y-4">
          {request.description ? (
            <div>
              <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                Deskripsi Pengajuan
              </p>
              <p className="text-[13px] leading-relaxed text-text-secondary">
                {request.description}
              </p>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
              Dokumen
            </p>
            <FileSection
              token={token}
              requestId={request.id}
              canUploadFinal={request.status === "APPROVED"}
            />
          </div>

          {request.status === "APPROVED" ? (
            <div className="flex justify-end border-t border-border pt-4">
              <Button variant="success" size="sm" onClick={onComplete}>
                <FileCheck className="size-3.5" />
                Tandai Selesai
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
