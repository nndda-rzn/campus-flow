"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { Eye, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAccessToken } from "@/lib/auth-storage";
import {
  ThesisFinalDocument,
  listLecturerFinalDocuments,
  startFinalDocumentReview,
  approveFinalDocument,
  requestRevisionFinalDocument,
  rejectFinalDocument,
} from "@/lib/thesis-final-document-api";
import { cn } from "@/lib/cn";

const STATUS_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "SUBMITTED", label: "Baru Masuk" },
  { value: "UNDER_REVIEW", label: "Sedang Direview" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "REVISION_REQUESTED", label: "Perlu Revisi" },
  { value: "REJECTED", label: "Ditolak" },
];

const DOC_TYPE_LABEL: Record<string, string> = {
  PROPOSAL: "Proposal",
  DRAFT: "Draft Skripsi",
  FINAL: "Skripsi Final",
  REVISED_FINAL: "Skripsi Final (Revisi)",
};

type ActionType = "APPROVE" | "REVISION" | "REJECT";

export default function LecturerFinalDocumentsPage() {
  return (
    <ProtectedPage
      title="Review Dokumen Skripsi"
      description="Review dan setujui dokumen skripsi dari mahasiswa bimbingan."
      allowedRoles={["DOSEN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [documents, setDocuments] = useState<ThesisFinalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("SUBMITTED");

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    doc: ThesisFinalDocument | null;
    type: ActionType;
  }>({ open: false, doc: null, type: "APPROVE" });
  const [actionNotes, setActionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await listLecturerFinalDocuments(token, {
        statusFilter: statusFilter || undefined,
      });
      setDocuments(res.data?.documents ?? []);
    } catch (err) {
      toast.error("Gagal memuat dokumen", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleStartReview(doc: ThesisFinalDocument) {
    const token = getAccessToken();
    if (!token) return;

    try {
      await startFinalDocumentReview(token, doc.id);
      toast.success("Status diubah menjadi Sedang Direview");
      await load();
    } catch (err) {
      toast.error("Gagal memulai review", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  function openAction(doc: ThesisFinalDocument, type: ActionType) {
    setActionDialog({ open: true, doc, type });
    setActionNotes("");
  }

  async function handleSubmitAction() {
    if (!actionDialog.doc) return;
    const token = getAccessToken();
    if (!token) return;

    if ((actionDialog.type === "REVISION" || actionDialog.type === "REJECT") && !actionNotes.trim()) {
      toast.error(
        actionDialog.type === "REVISION"
          ? "Catatan revisi wajib diisi"
          : "Alasan penolakan wajib diisi",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const docId = actionDialog.doc.id;
      switch (actionDialog.type) {
        case "APPROVE":
          await approveFinalDocument(token, docId, actionNotes);
          toast.success("Dokumen disetujui");
          break;
        case "REVISION":
          await requestRevisionFinalDocument(token, docId, actionNotes);
          toast.success("Permintaan revisi dikirim");
          break;
        case "REJECT":
          await rejectFinalDocument(token, docId, actionNotes);
          toast.success("Dokumen ditolak");
          break;
      }
      setActionDialog({ open: false, doc: null, type: "APPROVE" });
      await load();
    } catch (err) {
      toast.error("Gagal memproses dokumen", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? "default" : "secondary"}
              size="sm"
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <Button variant="secondary" size="icon" onClick={() => load()}>
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<FileText className="size-5" />}
            title="Tidak ada dokumen"
            description="Belum ada dokumen skripsi yang masuk untuk status ini."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onStartReview={() => handleStartReview(doc)}
              onAction={(type) => openAction(doc, type)}
            />
          ))}
        </div>
      )}

      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => {
          if (!open) setActionDialog({ open: false, doc: null, type: "APPROVE" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "APPROVE" && "Setujui Dokumen"}
              {actionDialog.type === "REVISION" && "Minta Revisi"}
              {actionDialog.type === "REJECT" && "Tolak Dokumen"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.doc?.studentName} ({actionDialog.doc?.studentNim}) -{" "}
              {actionDialog.doc?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-notes">
                {actionDialog.type === "APPROVE"
                  ? "Catatan (opsional)"
                  : actionDialog.type === "REVISION"
                    ? "Catatan revisi"
                    : "Alasan penolakan"}
              </Label>
              <Textarea
                id="action-notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={
                  actionDialog.type === "APPROVE"
                    ? "Tambahkan catatan jika diperlukan..."
                    : actionDialog.type === "REVISION"
                      ? "Jelaskan bagian yang perlu direvisi..."
                      : "Jelaskan alasan penolakan..."
                }
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setActionDialog({ open: false, doc: null, type: "APPROVE" })}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmitAction}
              disabled={isSubmitting}
              variant={actionDialog.type === "REJECT" ? "danger" : "default"}
            >
              {isSubmitting ? "Memproses..." : "Konfirmasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentCard({
  doc,
  onStartReview,
  onAction,
}: {
  doc: ThesisFinalDocument;
  onStartReview: () => void;
  onAction: (type: ActionType) => void;
}) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const fileURL = doc.fileId
    ? `${apiBase}/api/v1/files/${doc.fileId}/preview`
    : "";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-text-muted" />
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {DOC_TYPE_LABEL[doc.documentType] || doc.documentType}
            </span>
            <span className="text-xs text-text-muted">v{doc.version}</span>
            <StatusBadge status={doc.status} />
          </div>
          <h3 className="font-medium text-text-primary line-clamp-1">
            {doc.title}
          </h3>
          {doc.topicTitle && (
            <p className="text-xs text-text-muted line-clamp-1">
              Topik: {doc.topicTitle}
            </p>
          )}
          <p className="text-sm text-text-secondary">
            {doc.studentName} ({doc.studentNim})
          </p>
          <p className="text-xs text-text-muted">
            Disubmit:{" "}
            {doc.submittedAt
              ? new Date(doc.submittedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </p>
          {doc.lecturerNotes && (
            <p className="rounded bg-bg-subtle p-2 text-xs text-text-secondary">
              <span className="font-medium">Catatan Anda:</span> {doc.lecturerNotes}
            </p>
          )}
          {doc.rejectionReason && (
            <p className="rounded bg-status-error/10 p-2 text-xs text-status-error">
              <span className="font-medium">Alasan penolakan:</span> {doc.rejectionReason}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {fileURL && (
            <Button asChild size="sm" variant="secondary">
              <a href={fileURL} target="_blank" rel="noopener noreferrer">
                <Eye className="mr-2 size-3.5" />
                Lihat Dokumen
              </a>
            </Button>
          )}
          {doc.status === "SUBMITTED" && (
            <Button size="sm" onClick={onStartReview}>
              Mulai Review
            </Button>
          )}
          {doc.status === "UNDER_REVIEW" && (
            <>
              <Button size="sm" onClick={() => onAction("APPROVE")}>
                Setujui
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onAction("REVISION")}>
                Minta Revisi
              </Button>
              <Button size="sm" variant="danger" onClick={() => onAction("REJECT")}>
                Tolak
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
