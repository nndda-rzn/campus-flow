"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useState } from "react";
import {
  ChevronDown,
  Clock,
  FileText,
  Pencil,
  PlusCircle,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { FileSection } from "@/components/academic/file-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AcademicServiceItem,
  cancelAcademicRequest,
  createAcademicRequest,
  listAcademicServices,
  listMyAcademicRequests,
  submitAcademicRequest,
  updateAcademicRequest,
} from "@/lib/academic-api";
import { cn } from "@/lib/cn";

export default function StudentAcademicRequestsPage() {
  return (
    <ProtectedPage
      title="Pengajuan Layanan Akademik"
      description="Buat pengajuan baru dan pantau status pengajuan yang sedang diproses."
      allowedRoles={["MAHASISWA"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [services, setServices] = useState<AcademicServiceItem[]>([]);
  const [requests, setRequests] = useState<AcademicRequest[]>([]);
  const [serviceCode, setServiceCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Edit dialog state (for REVISION_REQUIRED)
  const [editTarget, setEditTarget] = useState<AcademicRequest | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] =
    useState<AcademicRequest | null>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  async function loadData() {
    const token = getAccessToken();
    if (!token) return;

    try {
      const [servicesResponse, requestsResponse] = await Promise.all([
        listAcademicServices(token),
        listMyAcademicRequests(token),
      ]);

      const svc = servicesResponse.data?.services ?? [];
      setServices(svc);
      setRequests(requestsResponse.data?.requests ?? []);

      if (svc[0] && !serviceCode) setServiceCode(svc[0].code);
    } catch (err) {
      toast.error("Gagal memuat data", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsLoadingList(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      toast.error("Sesi berakhir", { description: "Silakan login ulang" });
      return;
    }

    setIsCreating(true);
    try {
      await createAcademicRequest(token, {
        service_code: serviceCode,
        title,
        description,
      });

      toast.success("Pengajuan dibuat", {
        description: `${title} berhasil diajukan dan menunggu verifikasi.`,
      });
      setTitle("");
      setDescription("");
      await loadData();
    } catch (err) {
      toast.error("Gagal membuat pengajuan", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsCreating(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function openEditDialog(request: AcademicRequest) {
    setEditTarget(request);
    setEditTitle(request.title);
    setEditDescription(request.description ?? "");
  }

  function closeEditDialog() {
    setEditTarget(null);
    setEditTitle("");
    setEditDescription("");
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle === "") {
      toast.error("Judul wajib diisi");
      return;
    }
    if (trimmedTitle.length > 255) {
      toast.error("Judul maksimal 255 karakter");
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    setIsSavingEdit(true);
    try {
      // 1. Update title & description
      await updateAcademicRequest(token, {
        request_id: editTarget.id,
        title: trimmedTitle,
        description: editDescription.trim(),
      });
      // 2. Auto-resubmit so the request goes back into the verification queue.
      await submitAcademicRequest(token, {
        request_id: editTarget.id,
        note: "Pengajuan diperbaiki dan dikirim ulang oleh mahasiswa",
      });

      toast.success("Pengajuan berhasil dikirim ulang", {
        description: `${editTarget.requestNumber} kembali menunggu verifikasi.`,
      });
      closeEditDialog();
      await loadData();
    } catch (err) {
      toast.error("Gagal mengirim ulang", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsSavingEdit(false);
    }
  }

  function openCancelDialog(request: AcademicRequest) {
    setCancelTarget(request);
    setCancelNote("");
  }

  function closeCancelDialog() {
    setCancelTarget(null);
    setCancelNote("");
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    const token = getAccessToken();
    if (!token) return;

    setIsCancelling(true);
    try {
      await cancelAcademicRequest(token, {
        request_id: cancelTarget.id,
        note: cancelNote.trim(),
      });
      toast.success("Pengajuan dibatalkan", {
        description: `${cancelTarget.requestNumber} berhasil dibatalkan.`,
      });
      closeCancelDialog();
      await loadData();
    } catch (err) {
      toast.error("Gagal membatalkan", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        {/* ── Form ── */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="size-4 text-primary" />
              Buat Pengajuan
            </CardTitle>
            <p className="text-[12.5px] text-text-muted">
              Pengajuan akan diverifikasi Admin Prodi dalam 1–2 hari kerja.
            </p>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="service-code">Jenis Layanan</Label>
                <Select
                  value={serviceCode}
                  onValueChange={setServiceCode}
                  required
                >
                  <SelectTrigger id="service-code">
                    <SelectValue placeholder="Pilih jenis layanan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.code}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title">Judul Pengajuan</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Surat Aktif Kuliah Semester Genap"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">
                  Deskripsi{" "}
                  <span className="font-normal text-text-muted">
                    (opsional)
                  </span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tuliskan kebutuhan pengajuan, tujuan, dan informasi pendukung lainnya..."
                />
              </div>

              <Button
                type="submit"
                loading={isCreating}
                size="lg"
                className="w-full"
              >
                {!isCreating && <Sparkles className="size-4" />}
                {isCreating ? "Mengirim..." : "Buat Pengajuan"}
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* ── List ── */}
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-text-muted" />
                Riwayat Pengajuan
              </CardTitle>
              <p className="mt-0.5 text-[12.5px] text-text-muted">
                {isLoadingList
                  ? "Memuat..."
                  : `${requests.length} pengajuan tercatat`}
              </p>
            </div>
          </CardHeader>

          {isLoadingList ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={<FileText className="size-4" />}
              title="Belum ada pengajuan"
              description="Pengajuan yang Anda buat di formulir kiri akan muncul di sini."
            />
          ) : (
            <ul className="divide-y divide-border">
              {requests.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  isExpanded={expandedId === request.id}
                  onToggle={() => toggleExpand(request.id)}
                  onEdit={() => openEditDialog(request)}
                  onCancel={() => openCancelDialog(request)}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && closeEditDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Perbaiki & Kirim Ulang</DialogTitle>
            <DialogDescription>
              Setelah disimpan, pengajuan akan dikirim ulang ke Admin Prodi
              untuk diverifikasi.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {editTarget ? (
              <div className="rounded-md border border-border bg-background-alt p-3">
                <p className="font-mono text-[11.5px] text-text-muted">
                  {editTarget.requestNumber}
                </p>
                <p className="mt-1 text-[12.5px] text-text-secondary">
                  {editTarget.serviceName}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Judul Pengajuan</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description">
                Deskripsi{" "}
                <span className="font-normal text-text-muted">(opsional)</span>
              </Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="min-h-24"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isSavingEdit}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={handleSaveEdit} loading={isSavingEdit}>
              <Sparkles className="size-3.5" />
              Simpan & Kirim Ulang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Dialog ── */}
      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && closeCancelDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Pengajuan</DialogTitle>
            <DialogDescription>
              Pengajuan yang dibatalkan tidak dapat diaktifkan kembali. Buat
              pengajuan baru jika diperlukan.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {cancelTarget ? (
              <div className="rounded-md border border-border bg-background-alt p-3">
                <p className="font-mono text-[11.5px] text-text-muted">
                  {cancelTarget.requestNumber}
                </p>
                <p className="mt-1 text-[14px] font-medium text-text-primary">
                  {cancelTarget.title}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="cancel-note">
                Alasan{" "}
                <span className="font-normal text-text-muted">(opsional)</span>
              </Label>
              <Textarea
                id="cancel-note"
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="Jelaskan alasan pembatalan..."
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isCancelling}>
                Tutup
              </Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={handleCancel}
              loading={isCancelling}
            >
              <XCircle className="size-3.5" />
              Batalkan Pengajuan
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
  onEdit,
  onCancel,
}: {
  request: AcademicRequest;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const token = getAccessToken() ?? "";

  const canEdit = request.status === "REVISION_REQUIRED";
  const canCancel =
    request.status === "SUBMITTED" || request.status === "REVISION_REQUIRED";

  return (
    <li>
      <div className="flex w-full items-start gap-3 px-5 py-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={`request-detail-${request.id}`}
          className="flex min-w-0 flex-1 items-start gap-3 text-left transition-colors hover:opacity-80"
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

        {(canEdit || canCancel) && (
          <div className="flex shrink-0 items-center gap-1.5">
            {canEdit ? (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="size-3.5" />
                Perbaiki
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                aria-label="Batalkan pengajuan"
                title="Batalkan pengajuan"
              >
                <XCircle className="size-3.5" />
                Batalkan
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {isExpanded ? (
        <div
          id={`request-detail-${request.id}`}
          role="region"
          className="border-t border-border bg-background-alt px-5 py-4"
        >
          {request.description ? (
            <div className="mb-4">
              <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                Deskripsi
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
              canUploadSupporting
            />
          </div>
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

  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes}m lalu`;
  if (hours < 24) return `${hours}j lalu`;
  if (days < 7) return `${days}h lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
