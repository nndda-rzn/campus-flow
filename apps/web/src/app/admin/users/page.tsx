"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { Pencil, Power, Search, ShieldCheck, Users } from "lucide-react";
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
  AdminUser,
  assignUserRole,
  listUsers,
  setUserStatus,
  updateUser,
} from "@/lib/admin-api";

const ROLES = [
  "SUPER_ADMIN",
  "ADMIN_PRODI",
  "MAHASISWA",
  "DOSEN",
  "KAPRODI",
  "TATA_USAHA",
];

export default function AdminUsersPage() {
  return (
    <ProtectedPage
      title="Pengguna"
      description="Kelola seluruh pengguna sistem dan atur role / status mereka."
      allowedRoles={["SUPER_ADMIN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [roleValue, setRoleValue] = useState("");
  const [isSavingRole, setIsSavingRole] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await listUsers(token, {
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setUsers(res.data?.users ?? []);
    } catch (err) {
      toast.error("Gagal memuat pengguna", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q),
    );
  }, [users, search]);

  function openEdit(u: AdminUser) {
    setEditTarget(u);
    setEditName(u.fullName);
    setEditEmail(u.email);
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    const token = getAccessToken();
    if (!token) return;

    setIsSavingEdit(true);
    try {
      await updateUser(token, {
        user_id: editTarget.id,
        full_name: editName.trim(),
        email: editEmail.trim(),
      });
      toast.success("Profil pengguna diperbarui");
      setEditTarget(null);
      await load();
    } catch (err) {
      toast.error("Gagal memperbarui pengguna", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function toggleStatus(u: AdminUser) {
    const token = getAccessToken();
    if (!token) return;
    const next = u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await setUserStatus(token, { user_id: u.id, status: next });
      toast.success(
        next === "ACTIVE" ? "Pengguna diaktifkan" : "Pengguna dinonaktifkan",
      );
      await load();
    } catch (err) {
      toast.error("Gagal mengubah status", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  function openRole(u: AdminUser) {
    setRoleTarget(u);
    setRoleValue(u.role);
  }

  async function handleSaveRole() {
    if (!roleTarget) return;
    const token = getAccessToken();
    if (!token) return;

    setIsSavingRole(true);
    try {
      await assignUserRole(token, { user_id: roleTarget.id, role: roleValue });
      toast.success("Role berhasil diubah");
      setRoleTarget(null);
      await load();
    } catch (err) {
      toast.error("Gagal mengubah role", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSavingRole(false);
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
              placeholder="Cari nama atau email..."
              className="h-9 pl-8"
            />
          </div>
          <Select value={roleFilter || "ALL"} onValueChange={(v) => setRoleFilter(v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-9 w-full sm:w-44">
              <SelectValue placeholder="Semua role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua role</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-9 w-full sm:w-44">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua status</SelectItem>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="INACTIVE">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={<Users className="size-4" />}
              title="Belum ada pengguna"
              description="Tidak ada pengguna yang cocok dengan filter saat ini."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="text-[13.5px] font-medium text-text-primary">
                        {u.fullName}
                      </p>
                      <p className="mt-0.5 text-[12px] text-text-muted">
                        {u.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] font-mono text-text-secondary">
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(u)}
                          aria-label="Edit profil"
                          title="Edit profil"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openRole(u)}
                          aria-label="Ubah role"
                          title="Ubah role"
                        >
                          <ShieldCheck className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant={u.status === "ACTIVE" ? "ghost" : "secondary"}
                          onClick={() => toggleStatus(u)}
                          aria-label="Aktif / nonaktif"
                          title="Aktif / nonaktif"
                        >
                          <Power className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Edit dialog */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profil Pengguna</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">Nama Lengkap</Label>
              <Input
                id="user-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
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
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role dialog */}
      <Dialog
        open={roleTarget !== null}
        onOpenChange={(open) => !open && setRoleTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Role</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {roleTarget ? (
              <div className="rounded-md border border-border bg-background-alt p-3">
                <p className="text-[14px] font-medium text-text-primary">
                  {roleTarget.fullName}
                </p>
                <p className="mt-1 text-[12.5px] text-text-muted">
                  {roleTarget.email}
                </p>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="role-value">Role</Label>
              <Select value={roleValue} onValueChange={setRoleValue}>
                <SelectTrigger id="role-value">
                  <SelectValue placeholder="Pilih role..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isSavingRole}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={handleSaveRole} loading={isSavingRole}>
              <ShieldCheck className="size-3.5" />
              Simpan Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
