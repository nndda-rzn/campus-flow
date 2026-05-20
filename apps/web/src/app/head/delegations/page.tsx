"use client";

import { Suspense, useEffect, useState } from "react";
import {
  CalendarDays,
  Plus,
  Shield,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
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
import {
  DelegationItem,
  listDelegations,
  createDelegation,
  revokeDelegation,
} from "@/lib/delegation-api";
import { cn } from "@/lib/cn";

export default function HeadDelegationsPage() {
  return (
    <ProtectedPage
      title="Delegasi Approval"
      description="Delegasikan wewenang approval ke wakil saat Anda tidak tersedia."
      allowedRoles={["KAPRODI", "SUPER_ADMIN"]}
    >
      <Suspense fallback={null}>
        <DelegationsContent />
      </Suspense>
    </ProtectedPage>
  );
}

function DelegationsContent() {
  const [delegations, setDelegations] = useState<DelegationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<DelegationItem | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Form state
  const [delegateUserId, setDelegateUserId] = useState("");
  const [delegateName, setDelegateName] = useState("");
  const [reason, setReason] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  async function loadDelegations() {
    setIsLoading(true);
    try {
      const items = await listDelegations(true);
      setDelegations(items);
    } catch {
      toast.error("Gagal memuat data delegasi");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDelegations();
  }, []);

  function resetForm() {
    setDelegateUserId("");
    setDelegateName("");
    setReason("");
    setStartsAt("");
    setEndsAt("");
    setShowCreate(false);
  }

  async function handleCreate() {
    if (!delegateUserId.trim() || !delegateName.trim() || !startsAt || !endsAt) {
      toast.error("Semua field wajib diisi");
      return;
    }

    setIsCreating(true);
    try {
      await createDelegation({
        delegate_user_id: delegateUserId.trim(),
        delegate_name: delegateName.trim(),
        reason: reason.trim(),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
      });
      toast.success("Delegasi berhasil dibuat", {
        description: `${delegateName} dapat melakukan approval selama periode yang ditentukan.`,
      });
      resetForm();
      await loadDelegations();
    } catch (err) {
      toast.error("Gagal membuat delegasi", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setIsRevoking(true);
    try {
      await revokeDelegation(revokeTarget.id);
      toast.success("Delegasi dicabut", {
        description: `Delegasi untuk ${revokeTarget.delegate_name} telah dicabut.`,
      });
      setRevokeTarget(null);
      await loadDelegations();
    } catch (err) {
      toast.error("Gagal mencabut delegasi", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsRevoking(false);
    }
  }

  const activeDelegations = delegations.filter((d) => d.is_active && new Date(d.ends_at) > new Date());
  const expiredDelegations = delegations.filter((d) => !d.is_active || new Date(d.ends_at) <= new Date());

  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-text-secondary">
            Delegasikan wewenang approval Anda ke dosen atau staf lain saat cuti atau tidak tersedia.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="size-3.5" />
          Buat Delegasi
        </Button>
      </div>

      {/* Active Delegations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[14px]">
            <Shield className="size-4 text-success" />
            Delegasi Aktif
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : activeDelegations.length === 0 ? (
            <EmptyState
              icon={<UserCheck className="size-4" />}
              title="Tidak ada delegasi aktif"
              description="Buat delegasi baru untuk mendelegasikan wewenang approval."
            />
          ) : (
            <div className="space-y-3">
              {activeDelegations.map((d) => (
                <DelegationCard key={d.id} delegation={d} onRevoke={() => setRevokeTarget(d)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expired/Revoked Delegations */}
      {expiredDelegations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[14px]">
              <CalendarDays className="size-4 text-text-muted" />
              Riwayat Delegasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiredDelegations.map((d) => (
                <DelegationCard key={d.id} delegation={d} expired />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              Buat Delegasi Baru
            </DialogTitle>
            <DialogDescription>
              Orang yang didelegasikan akan dapat melakukan approve/reject pengajuan atas nama Anda.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="delegate-user-id">User ID Delegasi <span className="text-danger">*</span></Label>
                <Input id="delegate-user-id" value={delegateUserId} onChange={(e) => setDelegateUserId(e.target.value)} placeholder="UUID user yang didelegasikan" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delegate-name">Nama <span className="text-danger">*</span></Label>
                <Input id="delegate-name" value={delegateName} onChange={(e) => setDelegateName(e.target.value)} placeholder="Nama lengkap" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="starts-at">Mulai <span className="text-danger">*</span></Label>
                <Input id="starts-at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ends-at">Berakhir <span className="text-danger">*</span></Label>
                <Input id="ends-at" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Alasan</Label>
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: Cuti tahunan, Dinas luar kota..." />
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isCreating}>Batal</Button>
            </DialogClose>
            <Button onClick={handleCreate} loading={isCreating}>
              <Plus className="size-3.5" />
              Buat Delegasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={revokeTarget !== null} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="size-4 text-danger" />
              Cabut Delegasi
            </DialogTitle>
            <DialogDescription>
              Delegasi untuk <strong>{revokeTarget?.delegate_name}</strong> akan dicabut. Orang tersebut tidak lagi dapat melakukan approval atas nama Anda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isRevoking}>Batal</Button>
            </DialogClose>
            <Button variant="danger" onClick={handleRevoke} loading={isRevoking}>
              <XCircle className="size-3.5" />
              Cabut Delegasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DelegationCard({ delegation, expired, onRevoke }: { delegation: DelegationItem; expired?: boolean; onRevoke?: () => void }) {
  const start = new Date(delegation.starts_at);
  const end = new Date(delegation.ends_at);
  const now = new Date();
  const isCurrentlyActive = delegation.is_active && start <= now && end > now;

  return (
    <div className={cn(
      "flex items-center justify-between rounded-lg border p-4",
      expired ? "border-border bg-background-alt opacity-70" : "border-success/30 bg-success/5",
    )}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-medium text-text-primary">{delegation.delegate_name}</p>
          {isCurrentlyActive && (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10.5px] font-semibold text-success">Aktif</span>
          )}
          {delegation.revoked_at && (
            <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10.5px] font-semibold text-danger">Dicabut</span>
          )}
          {!delegation.is_active && !delegation.revoked_at && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-text-muted">Berakhir</span>
          )}
        </div>
        {delegation.reason && (
          <p className="text-[12.5px] text-text-secondary">{delegation.reason}</p>
        )}
        <p className="text-[11.5px] text-text-muted">
          {start.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          {" — "}
          {end.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>
      {onRevoke && delegation.is_active && (
        <Button variant="secondary" size="sm" onClick={onRevoke}>
          <XCircle className="size-3.5" />
          Cabut
        </Button>
      )}
    </div>
  );
}
