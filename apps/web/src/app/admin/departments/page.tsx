"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { Building2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
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
  Department,
  createDepartment,
  listDepartments,
  updateDepartment,
} from "@/lib/admin-api";

export default function AdminDepartmentsPage() {
  return (
    <ProtectedPage
      title="Program Studi"
      description="Kelola daftar program studi / departemen yang dipakai data akademik."
      allowedRoles={["SUPER_ADMIN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [items, setItems] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await listDepartments(token);
      setItems(res.data?.departments ?? []);
    } catch (err) {
      toast.error("Gagal memuat program studi", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditTarget(null);
    setCreating(true);
    setCode("");
    setName("");
  }

  function openEdit(d: Department) {
    setEditTarget(d);
    setCreating(false);
    setCode(d.code);
    setName(d.name);
  }

  function close() {
    setEditTarget(null);
    setCreating(false);
    setCode("");
    setName("");
  }

  async function handleSave() {
    const token = getAccessToken();
    if (!token) return;
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if (creating && (trimmedCode === "" || trimmedName === "")) {
      toast.error("Kode dan nama wajib diisi");
      return;
    }

    setIsSaving(true);
    try {
      if (creating) {
        await createDepartment(token, { code: trimmedCode, name: trimmedName });
        toast.success("Program studi dibuat");
      } else if (editTarget) {
        await updateDepartment(token, {
          id: editTarget.id,
          code: trimmedCode,
          name: trimmedName,
        });
        toast.success("Program studi diperbarui");
      }
      close();
      await load();
    } catch (err) {
      toast.error("Gagal menyimpan program studi", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items],
  );

  const dialogOpen = creating || editTarget !== null;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <Button onClick={openCreate}>
            <Plus className="size-3.5" />
            Tambah Program Studi
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
              icon={<Building2 className="size-4" />}
              title="Belum ada program studi"
              description="Tambahkan program studi pertama dengan tombol di atas."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <span className="font-mono text-[13px] text-text-secondary">
                        {d.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13.5px] font-medium text-text-primary">
                        {d.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(d)}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creating ? "Tambah Program Studi" : "Ubah Program Studi"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dept-code">Kode</Label>
              <Input
                id="dept-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="IF / SI / TI"
                required={creating}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-name">Nama</Label>
              <Input
                id="dept-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Informatika"
                required={creating}
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
    </>
  );
}
