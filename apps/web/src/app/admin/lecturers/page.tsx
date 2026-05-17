"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { Pencil, Search, Upload, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Department,
  DirectoryLecturer,
  listAllLecturers,
  listDepartments,
  setLecturerStatus,
  upsertLecturer,
} from "@/lib/admin-api";
import { BulkImportDialog } from "@/components/academic/bulk-import-dialog";

export default function AdminLecturersPage() {
  return (
    <ProtectedPage
      title="Dosen"
      description="Kelola data dosen, hubungkan akun ke NIDN, prodi, dan kuota pembimbing."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [lecturers, setLecturers] = useState<DirectoryLecturer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [editTarget, setEditTarget] = useState<DirectoryLecturer | null>(null);
  const [nidn, setNidn] = useState("");
  const [departmentID, setDepartmentID] = useState("");
  const [maxQuota, setMaxQuota] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const [lecturersRes, deptsRes] = await Promise.all([
        listAllLecturers(token, {
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        departments.length > 0
          ? Promise.resolve({ data: { departments } })
          : listDepartments(token),
      ]);
      setLecturers(lecturersRes.data?.lecturers ?? []);
      if (deptsRes.data?.departments) setDepartments(deptsRes.data.departments);
    } catch (err) {
      toast.error("Gagal memuat data dosen", {
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lecturers;
    return lecturers.filter(
      (l) =>
        l.fullName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.nidn.toLowerCase().includes(q),
    );
  }, [lecturers, search]);

  function openEdit(l: DirectoryLecturer) {
    setEditTarget(l);
    setNidn(l.nidn);
    setDepartmentID(l.departmentId);
    setMaxQuota(l.maxSupervisorQuota || 10);
  }

  function close() {
    setEditTarget(null);
    setNidn("");
    setDepartmentID("");
    setMaxQuota(10);
  }

  async function handleSave() {
    if (!editTarget) return;
    const token = getAccessToken();
    if (!token) return;

    setIsSaving(true);
    try {
      await upsertLecturer(token, {
        user_id: editTarget.userId,
        nidn: nidn.trim(),
        full_name: editTarget.fullName,
        email: editTarget.email,
        department_id: departmentID || undefined,
        max_supervisor_quota: maxQuota,
      });
      toast.success("Data dosen diperbarui");
      close();
      await load();
    } catch (err) {
      toast.error("Gagal menyimpan data dosen", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(l: DirectoryLecturer) {
    const token = getAccessToken();
    if (!token) return;
    const next = l.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await setLecturerStatus(token, { user_id: l.userId, status: next });
      toast.success("Status dosen diperbarui");
      await load();
    } catch (err) {
      toast.error("Gagal mengubah status", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIDN, atau email..."
              className="h-9 pl-8"
            />
          </div>
          <Select
            value={statusFilter || "ALL"}
            onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}
          >
            <SelectTrigger className="h-9 w-full sm:w-44">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua status</SelectItem>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="PENDING_BIND">Belum Terhubung</SelectItem>
              <SelectItem value="INACTIVE">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" onClick={() => setBulkOpen(true)}>
            <Upload className="size-3.5" />
            Import CSV
          </Button>
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="size-4" />}
              title="Belum ada dosen"
              description="Belum ada dosen terdaftar atau cocok dengan filter."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Dosen</TableHead>
                  <TableHead>NIDN</TableHead>
                  <TableHead>Prodi</TableHead>
                  <TableHead>Kuota</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <p className="text-[13.5px] font-medium text-text-primary">
                        {l.fullName}
                      </p>
                      <p className="mt-0.5 text-[12px] text-text-muted">
                        {l.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[13px] text-text-secondary">
                        {l.nidn || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-text-secondary">
                        {l.departmentName || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[13px] text-text-secondary">
                        {l.maxSupervisorQuota}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(l)}
                        >
                          <Pencil className="size-3.5" />
                          Hubungkan
                        </Button>
                        {l.status !== "PENDING_BIND" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleActive(l)}
                            aria-label="Aktif / nonaktif"
                            title="Aktif / nonaktif"
                          >
                            <UserCheck className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hubungkan Akun Dosen</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {editTarget ? (
              <div className="rounded-md border border-border bg-background-alt p-3">
                <p className="text-[14px] font-medium text-text-primary">
                  {editTarget.fullName}
                </p>
                <p className="mt-1 text-[12.5px] text-text-muted">
                  {editTarget.email}
                </p>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="lecturer-nidn">NIDN</Label>
              <Input
                id="lecturer-nidn"
                value={nidn}
                onChange={(e) => setNidn(e.target.value)}
                placeholder="Contoh: 0408059001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lecturer-dept">Program Studi</Label>
              <Select
                value={departmentID || "NONE"}
                onValueChange={(v) =>
                  setDepartmentID(v === "NONE" ? "" : v)
                }
              >
                <SelectTrigger id="lecturer-dept">
                  <SelectValue placeholder="Pilih program studi..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— belum ditentukan —</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lecturer-quota">Kuota Pembimbing</Label>
              <Input
                id="lecturer-quota"
                type="number"
                min={1}
                max={50}
                value={maxQuota}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setMaxQuota(Number.isNaN(n) ? 0 : n);
                }}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isSaving}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={handleSave} loading={isSaving}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        type="lecturer"
        onSuccess={() => load()}
      />
    </>
  );
}
