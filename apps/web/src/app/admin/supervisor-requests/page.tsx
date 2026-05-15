"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useState } from "react";
import { CheckCircle2, ClipboardCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { verifySupervisorRequest } from "@/lib/supervisor-api";

export default function AdminSupervisorRequestsPage() {
  return (
    <ProtectedPage
      title="Verifikasi Pengajuan Pembimbing"
      description="Verifikasi pengajuan dosen pembimbing sebelum Kaprodi menetapkan dosen."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [requestId, setRequestId] = useState("");
  const [note, setNote] = useState(
    "Topik dan pilihan dosen sudah diverifikasi.",
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestId.trim()) {
      toast.error("Request ID wajib diisi");
      return;
    }
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await verifySupervisorRequest(token, {
        request_id: requestId.trim(),
        note,
      });
      toast.success("Pengajuan diverifikasi", {
        description: `Status sekarang: ${response.data.request.status}. Diteruskan ke Kaprodi.`,
      });
      setRequestId("");
      setNote("Topik dan pilihan dosen sudah diverifikasi.");
      setConfirmOpen(false);
    } catch (err) {
      toast.error("Verifikasi gagal", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Form */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4 text-primary" />
              Form Verifikasi
            </CardTitle>
            <p className="text-[12.5px] text-text-muted">
              Masukkan Request ID dan catatan untuk memverifikasi pengajuan
              dosen pembimbing.
            </p>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="request-id">Request ID</Label>
                <Input
                  id="request-id"
                  value={requestId}
                  onChange={(e) => setRequestId(e.target.value)}
                  placeholder="UUID supervisor request"
                  className="font-mono text-[12.5px]"
                  required
                />
                <p className="text-[11.5px] text-text-muted">
                  Salin Request ID dari notifikasi atau dashboard.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="verify-note">Catatan Verifikasi</Label>
                <Textarea
                  id="verify-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-24"
                />
              </div>

              <Button type="submit" size="lg" className="w-full">
                <CheckCircle2 className="size-4" />
                Verifikasi Pengajuan
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* Side info */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="size-4 text-info" />
              Cara Kerja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[13px] leading-relaxed text-text-secondary">
            <div className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                1
              </span>
              <p>
                Mahasiswa mengajukan topik tugas akhir beserta calon dosen
                pembimbing.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                2
              </span>
              <p>
                Anda memverifikasi kelayakan topik dan pilihan dosen di halaman
                ini.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                3
              </span>
              <p>
                Kaprodi menetapkan satu dosen final dari daftar pilihan
                mahasiswa.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Verifikasi</DialogTitle>
            <DialogDescription>
              Pengajuan akan diteruskan ke Kaprodi untuk penetapan dosen
              pembimbing.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className="rounded-md border border-border bg-background-alt p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                Request ID
              </p>
              <p className="mt-1 break-all font-mono text-[12.5px] text-text-primary">
                {requestId}
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isLoading}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={handleConfirm} loading={isLoading}>
              <CheckCircle2 className="size-3.5" />
              Verifikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
