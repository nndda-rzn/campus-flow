"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getFAQCategories, getFAQs, createFAQ, updateFAQ, deleteFAQ, FAQCategoryItem, FAQItem } from "@/lib/faq-api";
import { getAccessToken } from "@/lib/auth-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminFAQPage() {
  const [categories, setCategories] = useState<FAQCategoryItem[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);

  const [formData, setFormData] = useState({
    category_id: "",
    question: "",
    answer: "",
    sequence_order: 1,
  });

  async function loadData() {
    const token = getAccessToken();
    if (!token) return;

    try {
      const [catRes, faqRes] = await Promise.all([
        getFAQCategories(token),
        getFAQs(token)
      ]);
      setCategories(catRes.data?.items || []);
      setFaqs(faqRes.data?.items || []);
    } catch (err) {
      toast.error("Gagal memuat data", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenForm(item?: FAQItem) {
    if (item) {
      setEditingItem(item);
      setFormData({
        category_id: item.categoryId,
        question: item.question,
        answer: item.answer,
        sequence_order: item.sequenceOrder,
      });
    } else {
      setEditingItem(null);
      setFormData({
        category_id: categories.length > 0 ? categories[0].id : "",
        question: "",
        answer: "",
        sequence_order: faqs.length + 1,
      });
    }
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    if (!formData.category_id) {
      toast.error("Pilih kategori terlebih dahulu");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateFAQ(token, editingItem.id, formData);
        toast.success("FAQ berhasil diperbarui");
      } else {
        await createFAQ(token, formData);
        toast.success("FAQ berhasil ditambahkan");
      }
      setIsOpen(false);
      await loadData();
    } catch (err) {
      toast.error(editingItem ? "Gagal memperbarui FAQ" : "Gagal menambahkan FAQ", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus FAQ ini?")) return;
    
    const token = getAccessToken();
    if (!token) return;

    try {
      await deleteFAQ(token, id);
      toast.success("FAQ berhasil dihapus");
      await loadData();
    } catch (err) {
      toast.error("Gagal menghapus FAQ", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    }
  }

  return (
    <ProtectedPage
      title="Manajemen FAQ & Panduan"
      description="Kelola pertanyaan umum yang dapat diakses oleh mahasiswa."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI"]}
    >
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-4">
          <CardTitle>Daftar FAQ</CardTitle>
          <Button onClick={() => handleOpenForm()}>+ Tambah FAQ</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] text-center">Urutan</TableHead>
                <TableHead className="w-[180px]">Kategori</TableHead>
                <TableHead>Pertanyaan & Jawaban</TableHead>
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
              ) : faqs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <EmptyState
                      title="Belum Ada FAQ"
                      description="Tambahkan FAQ pertama Anda."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                faqs.map((faq) => (
                  <TableRow key={faq.id}>
                    <TableCell className="align-top pt-4 text-center font-medium">
                      {faq.sequenceOrder}
                    </TableCell>
                    <TableCell className="align-top pt-4 font-medium text-[13.5px]">
                      {faq.categoryName}
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      <p className="font-semibold text-text-primary text-[14px]">{faq.question}</p>
                      <p className="text-text-secondary text-[13px] mt-1 line-clamp-2">
                        {faq.answer}
                      </p>
                    </TableCell>
                    <TableCell className="align-top pt-4 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[12px] h-8"
                        onClick={() => handleOpenForm(faq)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="text-[12px] h-8"
                        onClick={() => handleDelete(faq.id)}
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
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit FAQ" : "Tambah FAQ"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category_id">Kategori *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                >
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question">Pertanyaan *</Label>
                <Input
                  id="question"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="answer">Jawaban *</Label>
                <Textarea
                  id="answer"
                  required
                  rows={4}
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sequence_order">Nomor Urut</Label>
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
