"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import {
  listNoteTemplates,
  createNoteTemplate,
  updateNoteTemplate,
  deleteNoteTemplate,
  NoteTemplate,
} from "@/lib/note-template-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";

const CATEGORIES = [
  { value: "REVISION", label: "Revisi" },
  { value: "REJECTION", label: "Penolakan" },
  { value: "VERIFICATION", label: "Verifikasi" },
  { value: "ANNOUNCEMENT", label: "Pengumuman" },
];

export default function AdminNoteTemplatesPage() {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("");

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<NoteTemplate | null>(null);

  const [formData, setFormData] = useState({
    category: "REVISION",
    title: "",
    body: "",
  });

  async function loadData(category?: string) {
    try {
      const data = await listNoteTemplates(category || undefined);
      setTemplates(data);
    } catch (err) {
      toast.error("Gagal memuat template", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData(activeCategory);
  }, [activeCategory]);

  function handleOpenForm(item?: NoteTemplate) {
    if (item) {
      setEditingItem(item);
      setFormData({
        category: item.category,
        title: item.title,
        body: item.body,
      });
    } else {
      setEditingItem(null);
      setFormData({
        category: activeCategory || "REVISION",
        title: "",
        body: "",
      });
    }
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title.trim() || !formData.body.trim()) {
      toast.error("Judul dan isi template wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateNoteTemplate({
          id: editingItem.id,
          title: formData.title,
          body: formData.body,
          category: formData.category,
        });
        toast.success("Template berhasil diperbarui");
      } else {
        await createNoteTemplate({
          category: formData.category,
          title: formData.title,
          body: formData.body,
        });
        toast.success("Template berhasil ditambahkan");
      }
      setIsOpen(false);
      await loadData(activeCategory);
    } catch (err) {
      toast.error(
        editingItem ? "Gagal memperbarui template" : "Gagal menambahkan template",
        { description: err instanceof Error ? err.message : "Silakan coba lagi" },
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus template ini?")) return;

    try {
      await deleteNoteTemplate(id);
      toast.success("Template berhasil dihapus");
      await loadData(activeCategory);
    } catch (err) {
      toast.error("Gagal menghapus template", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    }
  }

  function getCategoryLabel(value: string) {
    return CATEGORIES.find((c) => c.value === value)?.label ?? value;
  }

  const filteredTemplates = templates;

  return (
    <ProtectedPage
      title="Template Catatan"
      description="Kelola template catatan untuk verifikasi, revisi, dan penolakan pengajuan."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI"]}
    >
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-4">
          <CardTitle>Daftar Template</CardTitle>
          <div className="flex items-center gap-3">
            <Select
              value={activeCategory}
              onValueChange={(val) => {
                setActiveCategory(val === "ALL" ? "" : val);
                setIsLoading(true);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kategori</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => handleOpenForm()}>+ Tambah Template</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[130px]">Kategori</TableHead>
                <TableHead>Judul & Isi</TableHead>
                <TableHead className="w-[100px] text-center">Dipakai</TableHead>
                <TableHead className="text-right w-[150px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-6 w-32" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <EmptyState
                      title="Belum Ada Template"
                      description="Tambahkan template pertama untuk mempercepat proses verifikasi."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell className="align-top pt-4">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {getCategoryLabel(tpl.category)}
                      </span>
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      <p className="font-semibold text-[14px]">{tpl.title}</p>
                      <p className="text-muted-foreground text-[13px] mt-1 line-clamp-2">
                        {tpl.body}
                      </p>
                    </TableCell>
                    <TableCell className="align-top pt-4 text-center">
                      <span className="text-sm font-medium">{tpl.usage_count}x</span>
                    </TableCell>
                    <TableCell className="align-top pt-4 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenForm(tpl)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(tpl.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Template" : "Tambah Template Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, category: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Judul</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Contoh: Dokumen pendukung tidak lengkap"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Isi Template</Label>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, body: e.target.value }))
                  }
                  placeholder="Isi catatan yang akan digunakan saat verifikasi/revisi..."
                  rows={4}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Menyimpan..."
                  : editingItem
                    ? "Simpan Perubahan"
                    : "Tambah Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}
