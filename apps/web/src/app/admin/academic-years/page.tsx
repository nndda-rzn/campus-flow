"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarRange, CheckCircle2, Plus, Power, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAccessToken } from "@/lib/auth-storage";
import {
  AcademicYear,
  createAcademicYear,
  listAcademicYears,
  setActiveAcademicYear,
} from "@/lib/academic-year-api";
import { cn } from "@/lib/cn";

export default function AcademicYearsPage() {
  return (
    <ProtectedPage
      title="Tahun Akademik"
      description="Kelola tahun akademik aktif. Pengajuan baru otomatis terkait ke tahun yang sedang aktif."
      allowedRoles={["SUPER_ADMIN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [items, setItems] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActiveNew, setIsActiveNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await listAcademicYears(token);
      setItems(res.data?.items ?? []);
    } catch (err) {
      toast.error("Gagal memuat tahun akademik", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      ),
    [items],
  );

  function openCreate() {
    setCreateOpen(true);
    setCode("");
    setName("");
    setStartDate("");
    setEndDate("");
    setIsActiveNew(false);
    setFormError("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !startDate || !endDate) {
      setFormError("Semua field wajib diisi.");
      return;
    }
    if (endDate < startDate) {
      setFormError("Tanggal akhir tidak boleh sebelum tanggal mulai.");
      return;
    }
    const token = getAccessToken();
    if (!token) return;

    setIsSaving(true);
    setFormError("");
    try {
      await createAcademicYear(token, {
        code: code.trim(),
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        is_active: isActiveNew,
      });
      toast.success("Tahun akademik dibuat");
      setCreateOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Gagal membuat tahun akademik",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetActive(year: AcademicYear) {
    const token = getAccessToken();
    if (!token) return;
    try {
      await setActiveAcademicYear(token, year.id);
      toast.success(`Tahun akademik aktif: ${year.name}`);
      await load();
    } catch (err) {
      toast.error("Gagal mengaktifkan", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-3.5" />
            Tambah Tahun Akademik
          </Button>
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={<CalendarRange className="size-4" />}
              title="Belum ada tahun akademik"
              description="Tambahkan minimal satu tahun akademik untuk memulai."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((y) => (
                  <TableRow key={y.id}>
                    <TableCell>
                      <span className="font-mono text-[12.5px] text-text-secondary">
                        {y.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-[13.5px] font-medium text-text-primary">
                        {y.name}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-[12.5px] text-text-muted">
                        {formatDate(y.startDate)} — {formatDate(y.endDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {y.isActive ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="neutral">Nonaktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {y.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[12px] text-success-text">
                          <CheckCircle2 className="size-3.5" />
                          Sedang aktif
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetActive(y)}
                        >
                          <Power className="size-3.5" />
                          Jadikan Aktif
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={(o) => !o && setCreateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Tahun Akademik</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ay-code">Kode</Label>
                <Input
                  id="ay-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: 2026-2027-GANJIL"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ay-name">Nama</Label>
                <Input
                  id="ay-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Ganjil 2026/2027"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ay-start">Tanggal Mulai</Label>
                  <Input
                    id="ay-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ay-end">Tanggal Akhir</Label>
                  <Input
                    id="ay-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-text-secondary">
                <input
                  type="checkbox"
                  checked={isActiveNew}
                  onChange={(e) => setIsActiveNew(e.target.checked)}
                  className="rounded border-border"
                />
                Jadikan tahun akademik aktif setelah dibuat
              </label>
              {formError && (
                <p className="text-[12.5px] text-danger">{formError}</p>
              )}
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isSaving}>
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" loading={isSaving}>
                <Plus className="size-3.5" />
                Tambah
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatDate(s: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
