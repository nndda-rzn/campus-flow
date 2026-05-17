"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Pencil, Search, UserCheck } from "lucide-react";
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
  DirectoryStudent,
  listDepartments,
  listStudents,
  setStudentStatus,
  upsertStudent,
} from "@/lib/admin-api";

export default function AdminStudentsPage() {
  return (
    <ProtectedPage
      title="Mahasiswa"
      description="Kelola data mahasiswa, hubungkan akun ke NIM dan program studi."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [editTarget, setEditTarget] = useState<DirectoryStudent | null>(null);
  const [nim, setNim] = useState("");
  const [departmentID, setDepartmentID] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const [studentsRes, deptsRes] = await Promise.all([
        listStudents(token, {
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        departments.length > 0
          ? Promise.resolve({ data: { departments } })
          : listDepartments(token),
      ]);
      setStudents(studentsRes.data?.students ?? []);
      if (deptsRes.data?.departments) setDepartments(deptsRes.data.departments);
    } catch (err) {
      toast.error("Gagal memuat data mahasiswa", {
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
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.nim.toLowerCase().includes(q),
    );
  }, [students, search]);

  function openEdit(s: DirectoryStudent) {
    setEditTarget(s);
    setNim(s.nim);
    setDepartmentID(s.departmentId);
  }

  function close() {
    setEditTarget(null);
    setNim("");
    setDepartmentID("");
  }

  async function handleSave() {
    if (!editTarget) return;
    const token = getAccessToken();
    if (!token) return;

    setIsSaving(true);
    try {
      await upsertStudent(token, {
        user_id: editTarget.userId,
        nim: nim.trim(),
        full_name: editTarget.fullName,
        email: editTarget.email,
        department_id: departmentID || undefined,
      });
      toast.success("Data mahasiswa diperbarui");
      close();
      await load();
    } catch (err) {
      toast.error("Gagal menyimpan data mahasiswa", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleActivate(s: DirectoryStudent) {
    const token = getAccessToken();
    if (!token) return;
    const next = s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await setStudentStatus(token, { user_id: s.userId, status: next });
      toast.success("Status mahasiswa diperbarui");
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
              placeholder="Cari nama, NIM, atau email..."
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
              icon={<GraduationCap className="size-4" />}
              title="Belum ada mahasiswa"
              description="Belum ada mahasiswa terdaftar atau cocok dengan filter."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Mahasiswa</TableHead>
                  <TableHead>NIM</TableHead>
                  <TableHead>Prodi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="text-[13.5px] font-medium text-text-primary">
                        {s.fullName}
                      </p>
                      <p className="mt-0.5 text-[12px] text-text-muted">
                        {s.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[13px] text-text-secondary">
                        {s.nim || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-text-secondary">
                        {s.departmentName || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="size-3.5" />
                          Hubungkan
                        </Button>
                        {s.status !== "PENDING_BIND" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleActivate(s)}
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
            <DialogTitle>Hubungkan Akun Mahasiswa</DialogTitle>
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
              <Label htmlFor="student-nim">NIM</Label>
              <Input
                id="student-nim"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                placeholder="Contoh: 21SI001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="student-dept">Program Studi</Label>
              <Select
                value={departmentID || "NONE"}
                onValueChange={(v) =>
                  setDepartmentID(v === "NONE" ? "" : v)
                }
              >
                <SelectTrigger id="student-dept">
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
    </>
  );
}
