"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getThesisMilestones, createThesisMilestone, updateThesisMilestone, deleteThesisMilestone, ThesisMilestoneItem } from "@/lib/thesis-api";
import { listDepartments, Department } from "@/lib/admin-api";
import { getAccessToken, getCurrentUser } from "@/lib/auth-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminThesisMilestonesPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [milestones, setMilestones] = useState<ThesisMilestoneItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<ThesisMilestoneItem | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    sequence_order: 1,
  });

  async function loadDepts() {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await listDepartments(token);
      const depts = res.data?.departments || [];
      setDepartments(depts);
      if (depts.length > 0) {
        setSelectedDeptId(depts[0].id);
      }
    } catch (err) {
      toast.error("Gagal memuat prodi");
    }
  }

  async function loadMilestones(deptId: string) {
    const token = getAccessToken();
    if (!token || !deptId) return;

    setIsLoading(true);
    try {
      const res = await getThesisMilestones(token, deptId);
      setMilestones(res.data?.items || []);
    } catch (err) {
      toast.error("Gagal memuat milestone");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDepts();
  }, []);

  useEffect(() => {
    if (selectedDeptId) {
      loadMilestones(selectedDeptId);
    }
  }, [selectedDeptId]);

  function handleOpenForm(item?: ThesisMilestoneItem) {
    if (item) {
      setEditingItem(item);
      setFormData({
        code: item.code,
        name: item.name,
        description: item.description || "",
        sequence_order: item.sequenceOrder,
      });
    } else {
      setEditingItem(null);
      setFormData({
        code: `MS_${milestones.length + 1}`,
        name: "",
        description: "",
        sequence_order: milestones.length + 1,
      });
    }
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateThesisMilestone(token, editingItem.id, {
          name: formData.name,
          description: formData.description,
          sequence_order: formData.sequence_order,
        });
        toast.success("Milestone berhasil diperbarui");
      } else {
        await createThesisMilestone(token, {
          department_id: selectedDeptId,
          ...formData,
        });
        toast.success("Milestone berhasil ditambahkan");
      }
      setIsOpen(false);
      await loadMilestones(selectedDeptId);
    } catch (err) {
      toast.error(editingItem ? "Gagal memperbarui milestone" : "Gagal menambahkan milestone", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus milestone ini? Progress mahasiswa terkait mungkin akan terpengaruh.")) return;
    
    const token = getAccessToken();
    if (!token) return;

    try {
      await deleteThesisMilestone(token, id);
      toast.success("Milestone berhasil dihapus");
      await loadMilestones(selectedDeptId);
    } catch (err) {
      toast.error("Gagal menghapus milestone", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    }
  }

  return (
    <ProtectedPage
      title="Manajemen Milestone Skripsi"
      description="Kelola tahapan tugas akhir per program studi."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI"]}
    >
      <div className="mb-6 max-w-sm">
        <Label className="mb-2 block">Pilih Program Studi</Label>
        <Select
          value={selectedDeptId}
          onValueChange={setSelectedDeptId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih prodi..." />
          </SelectTrigger>
          <SelectContent>
            {departments.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-4">
          <CardTitle>Tahapan Milestone</CardTitle>
          <Button onClick={() => handleOpenForm()} disabled={!selectedDeptId}>+ Tambah Tahap</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] text-center">Urutan</TableHead>
                <TableHead className="w-[120px]">Kode</TableHead>
                <TableHead>Nama Tahapan & Deskripsi</TableHead>
                <TableHead className="text-right w-[150px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex justify-center"><Skeleton className="h-6 w-32" /></div>
                  </TableCell>
                </TableRow>
              ) : milestones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <EmptyState
                      title="Belum Ada Tahapan"
                      description="Tambahkan milestone penyelesaian skripsi."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                milestones.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="align-top pt-4 text-center font-bold">
                      {m.sequenceOrder}
                    </TableCell>
                    <TableCell className="align-top pt-4 font-mono text-[12px] text-text-muted">
                      {m.code}
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      <p className="font-semibold text-text-primary text-[14px]">{m.name}</p>
                      <p className="text-text-secondary text-[13px] mt-1">
                        {m.description || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="align-top pt-4 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[12px] h-8"
                        onClick={() => handleOpenForm(m)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="text-[12px] h-8"
                        onClick={() => handleDelete(m.id)}
                      >
                        Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Milestone" : "Tambah Milestone"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4 py-4">
              {!editingItem && (
                <div className="space-y-2">
                  <Label htmlFor="code">Kode Internal *</Label>
                  <Input
                    id="code"
                    required
                    placeholder="Misal: TOPIC_APPROVED"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nama Tahapan *</Label>
                <Input
                  id="name"
                  required
                  placeholder="Misal: Seminar Proposal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sequence_order">Nomor Urut *</Label>
                <Input
                  id="sequence_order"
                  type="number"
                  min="1"
                  required
                  value={formData.sequence_order}
                  onChange={(e) => setFormData({ ...formData, sequence_order: parseInt(e.target.value) || 1 })}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Batal</Button>
              </DialogClose>
              <Button type="submit" loading={isSubmitting}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}
