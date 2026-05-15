"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  GraduationCap,
  Inbox,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getAccessToken } from "@/lib/auth-storage";
import {
  SupervisorRequest,
  acceptSupervisorRequest,
  listLecturerSupervisorRequests,
  rejectSupervisorRequest,
} from "@/lib/supervisor-api";
import { cn } from "@/lib/cn";

const FILTERS = [
  { value: "ASSIGNED", label: "Penetapan Baru" },
  { value: "ACCEPTED", label: "Diterima" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "ALL", label: "Semua" },
];

type ActionType = "accept" | "reject";

export default function LecturerSupervisorRequestsPage() {
  return (
    <ProtectedPage
      title="Permintaan Pembimbing"
      description="Terima atau tolak penetapan sebagai dosen pembimbing dari Kaprodi."
      allowedRoles={["DOSEN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [requests, setRequests] = useState<SupervisorRequest[]>([]);
  const [filter, setFilter] = useState("ASSIGNED");
  const [isLoading, setIsLoading] = useState(true);

  const [actionTarget, setActionTarget] = useState<{
    type: ActionType;
    request: SupervisorRequest;
  } | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  async function loadRequests() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await listLecturerSupervisorRequests(token);
      setRequests(response.data.requests);
    } catch (err) {
      toast.error("Gagal memuat data", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    if (filter === "ALL") return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const assignedCount = useMemo(
    () => requests.filter((r) => r.status === "ASSIGNED").length,
    [requests],
  );

  function openActionDialog(type: ActionType, request: SupervisorRequest) {
    setActionTarget({ type, request });
    setActionNote(
      type === "accept"
        ? "Bersedia menerima penetapan sebagai pembimbing."
        : "",
    );
  }

  function closeActionDialog() {
    setActionTarget(null);
    setActionNote("");
  }

  async function handleAction() {
    if (!actionTarget) return;
    const token = getAccessToken();
    if (!token) return;

    if (actionTarget.type === "reject" && !actionNote.trim()) {
      toast.error("Catatan wajib diisi", {
        description: "Sertakan alasan penolakan.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      if (actionTarget.type === "accept") {
        await acceptSupervisorRequest(token, {
          request_id: actionTarget.request.id,
          note: actionNote.trim(),
        });
        toast.success("Penetapan diterima", {
          description: actionTarget.request.topicTitle,
        });
      } else {
        await rejectSupervisorRequest(token, {
          request_id: actionTarget.request.id,
          note: actionNote.trim(),
        });
        toast.success("Penetapan ditolak", {
          description: "Kaprodi akan menetapkan dosen pembimbing alternatif.",
        });
      }
      closeActionDialog();
      await loadRequests();
    } catch (err) {
      toast.error("Gagal memproses", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="overflow-x-auto">
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                  {f.value === "ASSIGNED" && assignedCount > 0 ? (
                    <span className="ml-1 rounded-full bg-warning-soft px-1.5 py-0 text-[10.5px] font-semibold tabular-nums leading-tight text-warning-text">
                      {assignedCount}
                    </span>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Button
            variant="secondary"
            size="icon"
            onClick={loadRequests}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Inbox className="size-4" />}
              title={
                filter === "ASSIGNED"
                  ? "Tidak ada penetapan baru"
                  : "Tidak ada penetapan"
              }
              description={
                filter === "ASSIGNED"
                  ? "Penetapan baru dari Kaprodi akan muncul di sini."
                  : "Tidak ada penetapan dengan status tersebut."
              }
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {filteredRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onAccept={() => openActionDialog("accept", request)}
                onReject={() => openActionDialog("reject", request)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog
        open={actionTarget !== null}
        onOpenChange={(open) => !open && closeActionDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionTarget?.type === "accept" ? (
                <>
                  <CheckCircle2 className="size-4 text-success" />
                  Terima Penetapan
                </>
              ) : (
                <>
                  <XCircle className="size-4 text-danger" />
                  Tolak Penetapan
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionTarget?.type === "accept"
                ? "Anda akan menjadi pembimbing untuk topik ini."
                : "Kaprodi akan menetapkan dosen alternatif untuk pengajuan ini."}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {actionTarget ? (
              <div className="rounded-md border border-border bg-background-alt p-3">
                <p className="font-mono text-[11.5px] text-text-muted">
                  {actionTarget.request.requestNumber}
                </p>
                <p className="mt-1 text-[14px] font-medium text-text-primary">
                  {actionTarget.request.topicTitle}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="lecturer-action-note">
                Catatan{" "}
                {actionTarget?.type === "reject" ? (
                  <span className="font-normal text-danger">(wajib)</span>
                ) : null}
              </Label>
              <Textarea
                id="lecturer-action-note"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={
                  actionTarget?.type === "accept"
                    ? "Catatan opsional untuk Kaprodi dan mahasiswa..."
                    : "Jelaskan alasan tidak bisa menerima penetapan..."
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
            {actionTarget?.type === "accept" ? (
              <Button
                variant="success"
                onClick={handleAction}
                loading={isProcessing}
              >
                <CheckCircle2 className="size-3.5" />
                Terima
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={handleAction}
                loading={isProcessing}
              >
                <XCircle className="size-3.5" />
                Tolak
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Request Card ────────────────────────────────────────────────────────────

function RequestCard({
  request,
  onAccept,
  onReject,
}: {
  request: SupervisorRequest;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <li>
      <Card className="overflow-hidden">
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <GraduationCap className="size-4 shrink-0 text-text-muted" />
                <p className="text-[14.5px] font-semibold leading-tight tracking-tight text-text-primary">
                  {request.topicTitle}
                </p>
              </div>
              <p className="mt-1 font-mono text-[11.5px] text-text-muted">
                {request.requestNumber}
              </p>
            </div>
            <StatusBadge status={request.status} />
          </div>

          {request.topicDescription ? (
            <p className="text-[13px] leading-relaxed text-text-secondary">
              {request.topicDescription}
            </p>
          ) : null}

          {request.status === "ASSIGNED" ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="success" size="sm" onClick={onAccept}>
                <CheckCircle2 className="size-3.5" />
                Terima Penetapan
              </Button>
              <Button variant="secondary" size="sm" onClick={onReject}>
                <XCircle className="size-3.5" />
                Tolak
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </li>
  );
}
