"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, GraduationCap, Info, Users } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Lecturer,
  assignSupervisor,
  listLecturers,
} from "@/lib/supervisor-api";

export default function HeadSupervisorRequestsPage() {
  return (
    <ProtectedPage
      title="Penetapan Dosen Pembimbing"
      description="Tetapkan dosen pembimbing untuk pengajuan yang sudah diverifikasi Admin Prodi."
      allowedRoles={["KAPRODI"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [requestId, setRequestId] = useState("");
  const [lecturerId, setLecturerId] = useState("");
  const [note, setNote] = useState("Dosen pembimbing ditetapkan oleh Kaprodi.");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    async function loadLecturers() {
      const token = getAccessToken();
      if (!token) return;
      try {
        const response = await listLecturers(token);
        setLecturers(response.data.lecturers);
        if (response.data.lecturers.length > 0) {
          setLecturerId(response.data.lecturers[0].id);
        }
      } catch (err) {
        toast.error("Gagal memuat daftar dosen", {
          description: err instanceof Error ? err.message : "Coba lagi",
        });
      }
    }

    loadLecturers();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestId.trim() || !lecturerId) {
      toast.error("Field tidak lengkap", {
        description: "Request ID dan dosen wajib diisi.",
      });
      return;
    }
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await assignSupervisor(token, {
        request_id: requestId.trim(),
        lecturer_id: lecturerId,
        note,
      });

      const selected = lecturers.find((l) => l.id === lecturerId);
      toast.success("Dosen ditetapkan", {
        description: `${selected?.fullName ?? "Dosen"} ditetapkan untuk pengajuan. Status: ${response.data.request.status}`,
      });

      setRequestId("");
      setNote("Dosen pembimbing ditetapkan oleh Kaprodi.");
      setConfirmOpen(false);
    } catch (err) {
      toast.error("Gagal menetapkan dosen", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const selectedLecturer = lecturers.find((l) => l.id === lecturerId);

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* ── Form ── */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-4 text-primary" />
              Form Penetapan Dosen
            </CardTitle>
            <p className="text-[12.5px] text-text-muted">
              Pilih dosen yang akan ditetapkan sebagai pembimbing untuk
              pengajuan yang sudah diverifikasi.
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
                  Salin Request ID dari notifikasi atau dashboard Admin Prodi.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lecturer-id">Dosen Pembimbing</Label>
                <Select
                  value={lecturerId}
                  onValueChange={setLecturerId}
                  required
                >
                  <SelectTrigger id="lecturer-id">
                    <SelectValue placeholder="Pilih dosen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lecturers.map((lecturer) => (
                      <SelectItem key={lecturer.id} value={lecturer.id}>
                        <div className="flex flex-col">
                          <span>{lecturer.fullName}</span>
                          <span className="font-mono text-[10.5px] text-text-muted">
                            {lecturer.nidn
                              ? `NIDN ${lecturer.nidn}`
                              : "Tanpa NIDN"}{" "}
                            · Kuota {lecturer.maxSupervisorQuota}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assign-note">
                  Catatan{" "}
                  <span className="font-normal text-text-muted">
                    (akan dikirim ke dosen)
                  </span>
                </Label>
                <Textarea
                  id="assign-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-24"
                />
              </div>

              <Button
                type="submit"
                disabled={lecturers.length === 0}
                size="lg"
                className="w-full"
              >
                <CheckCircle2 className="size-4" />
                Tetapkan Dosen
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* ── Side info ── */}
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
                Salin <span className="font-medium">Request ID</span> dari
                pengajuan yang sudah diverifikasi.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                2
              </span>
              <p>
                Pilih dosen pembimbing yang sesuai topik dan kuotanya masih
                tersedia.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                3
              </span>
              <p>
                Dosen akan menerima notifikasi untuk{" "}
                <span className="font-medium">terima atau tolak</span> penetapan
                ini.
              </p>
            </div>

            <div className="rounded-md border border-info-soft bg-info-soft/40 px-3 py-2.5">
              <p className="flex items-start gap-2 text-[12.5px] text-info-text">
                <Users className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Total{" "}
                  <span className="font-mono font-semibold">
                    {lecturers.length}
                  </span>{" "}
                  dosen aktif tersedia.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="size-4 text-primary" />
              Konfirmasi Penetapan
            </DialogTitle>
            <DialogDescription>
              Pastikan informasi berikut sudah benar sebelum melanjutkan.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-3">
            <div className="rounded-md border border-border bg-background-alt p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                Request ID
              </p>
              <p className="mt-1 break-all font-mono text-[12.5px] text-text-primary">
                {requestId}
              </p>
            </div>

            {selectedLecturer ? (
              <div className="rounded-md border border-border bg-background-alt p-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                  Dosen
                </p>
                <p className="mt-1 text-[14px] font-medium text-text-primary">
                  {selectedLecturer.fullName}
                </p>
                <p className="mt-0.5 font-mono text-[11.5px] text-text-muted">
                  {selectedLecturer.nidn
                    ? `NIDN ${selectedLecturer.nidn}`
                    : "Tanpa NIDN"}{" "}
                  · Kuota {selectedLecturer.maxSupervisorQuota}
                </p>
              </div>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isLoading}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={handleConfirm} loading={isLoading}>
              <CheckCircle2 className="size-3.5" />
              Tetapkan Dosen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
