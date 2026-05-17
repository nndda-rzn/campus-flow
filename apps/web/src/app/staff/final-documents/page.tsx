"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { CheckCircle2, FileCheck, Inbox, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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

export default function StaffFinalDocumentsPage() {
  return (
    <ProtectedPage
      title="Dokumen Final"
      description="Pengajuan yang sudah disetujui Kaprodi dan menunggu upload dokumen final."
      allowedRoles={["TATA_USAHA", "SUPER_ADMIN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [requests, setRequests] = useState<AcademicRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [completeTarget, setCompleteTarget] =
    useState<AcademicRequest | null>(null);
  const [completeNote, setCompleteNote] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await listAllAcademicRequests(token, "APPROVED");
      setRequests(res.data?.requests ?? []);
    } catch (err) {
      toast.error("Gagal memuat dokumen final", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
        description: `${completeTarget.requestNumber} ditandai selesai dan mahasiswa diberitahu.`,
      });
      setCompleteTarget(null);
      setCompleteNote("");
      await load();
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
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-text-muted">
            {isLoading
              ? "Memuat..."
              : `${requests.length} pengajuan menunggu dokumen final`}
          </p>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => load()}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Inbox className="size-4" />}
              title="Tidak ada pengajuan menunggu"
              description="Pengajuan yang sudah disetujui Kaprodi akan muncul di sini."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onComplete={() => {
                  setCompleteTarget(request);
                  setCompleteNote("");
                }}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={completeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteTarget(null);
            setCompleteNote("");
          }
        }}
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
                placeholder="Misal lokasi pengambilan dokumen fisik..."
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

function RequestCard({
  request,
  onComplete,
}: {
  request: AcademicRequest;
  onComplete: () => void;
}) {
  const token = getAccessToken() ?? "";

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-semibold text-text-primary">
              {request.title}
            </p>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-1 font-mono text-[11.5px] text-text-muted">
            {request.requestNumber}
          </p>
          <p className="mt-1 text-[12.5px] text-text-secondary">
            {request.serviceName}
          </p>
        </div>
      </div>

      {request.description ? (
        <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">
          {request.description}
        </p>
      ) : null}

      <div className="mt-4">
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
          Dokumen
        </p>
        <FileSection token={token} requestId={request.id} canUploadFinal />
      </div>

      <div className="mt-4 flex justify-end border-t border-border pt-3">
        <Button variant="success" size="sm" onClick={onComplete}>
          <FileCheck className="size-3.5" />
          Tandai Selesai
        </Button>
      </div>
    </Card>
  );
}
