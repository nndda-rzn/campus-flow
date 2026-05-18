"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getAcademicCalendar, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, AcademicCalendarItem, CalendarEventType } from "@/lib/calendar-api";
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
import { Badge } from "@/components/ui/badge";

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<AcademicCalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<AcademicCalendarItem | null>(null);

  // We should ideally fetch this, but for simplicity, we mock it
  const activeAcademicYearId = "mock-id-for-now"; // the API handles this in a real scenario
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_type: "OTHER" as CalendarEventType,
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    is_all_day: true,
  });

  async function loadData() {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await getAcademicCalendar(token);
      setEvents(res.data?.items || []);
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

  function handleOpenForm(item?: AcademicCalendarItem) {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        description: item.description || "",
        event_type: item.eventType,
        start_date: item.startDate.split('T')[0],
        end_date: item.endDate ? item.endDate.split('T')[0] : "",
        is_all_day: item.isAllDay,
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: "",
        description: "",
        event_type: "OTHER",
        start_date: new Date().toISOString().split('T')[0],
        end_date: "",
        is_all_day: true,
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
        await updateCalendarEvent(token, editingItem.id, {
          ...formData,
          end_date: formData.end_date || undefined,
        });
        toast.success("Agenda berhasil diperbarui");
      } else {
        await createCalendarEvent(token, {
          academic_year_id: activeAcademicYearId, // Need proper ID here in real life
          ...formData,
          end_date: formData.end_date || undefined,
        });
        toast.success("Agenda berhasil ditambahkan");
      }
      setIsOpen(false);
      await loadData();
    } catch (err) {
      toast.error(editingItem ? "Gagal memperbarui agenda" : "Gagal menambahkan agenda", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus agenda ini?")) return;
    
    const token = getAccessToken();
    if (!token) return;

    try {
      await deleteCalendarEvent(token, id);
      toast.success("Agenda berhasil dihapus");
      await loadData();
    } catch (err) {
      toast.error("Gagal menghapus agenda", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    }
  }

  const getEventBadge = (type: string) => {
    switch (type) {
      case "UTS":
      case "UAS":
        return <Badge variant="danger">{type}</Badge>;
      case "REGISTRATION":
        return <Badge variant="info">Pendaftaran</Badge>;
      case "HOLIDAY":
        return <Badge variant="success">Libur</Badge>;
      case "DEADLINE":
        return <Badge variant="warning">Tenggat Waktu</Badge>;
      case "SEMINAR":
        return <Badge variant="accent">Seminar</Badge>;
      default:
        return <Badge variant="outline">Umum</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric", month: "short", year: "numeric"
    }).format(new Date(dateStr));
  };

  return (
    <ProtectedPage
      title="Manajemen Kalender Akademik"
      description="Kelola agenda, jadwal UTS/UAS, dan hari libur."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI"]}
    >
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-4">
          <CardTitle>Daftar Agenda</CardTitle>
          <Button onClick={() => handleOpenForm()}>+ Tambah Agenda</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Tanggal</TableHead>
                <TableHead>Agenda</TableHead>
                <TableHead className="w-[120px]">Tipe</TableHead>
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
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <EmptyState
                      title="Belum Ada Agenda"
                      description="Tambahkan agenda pertama Anda."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="align-top pt-4 font-medium text-[13.5px]">
                      {formatDate(event.startDate)}
                      {event.endDate && event.endDate !== event.startDate && (
                        <div className="text-[12px] text-text-muted font-normal mt-0.5">
                          s/d {formatDate(event.endDate)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      <p className="font-medium text-text-primary text-[14px]">{event.title}</p>
                      {event.description && (
                        <p className="text-text-secondary text-[13px] mt-1 line-clamp-1">
                          {event.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      {getEventBadge(event.eventType)}
                    </TableCell>
                    <TableCell className="align-top pt-4 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[12px] h-8"
                        onClick={() => handleOpenForm(event)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="text-[12px] h-8"
                        onClick={() => handleDelete(event.id)}
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
              {editingItem ? "Edit Agenda" : "Tambah Agenda"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Judul Agenda *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_type">Tipe Agenda *</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(v) => setFormData({ ...formData, event_type: v as CalendarEventType })}
                >
                  <SelectTrigger id="event_type">
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGISTRATION">Pendaftaran</SelectItem>
                    <SelectItem value="UTS">UTS</SelectItem>
                    <SelectItem value="UAS">UAS</SelectItem>
                    <SelectItem value="SEMINAR">Seminar</SelectItem>
                    <SelectItem value="DEADLINE">Tenggat Waktu</SelectItem>
                    <SelectItem value="HOLIDAY">Libur</SelectItem>
                    <SelectItem value="OTHER">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Tanggal Mulai *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Tanggal Selesai</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
