"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAccessToken } from "@/lib/auth-storage";
import {
  ConsultationSlot,
  listLecturerSlots,
  createSlot,
  updateSlot,
  cancelSlot,
} from "@/lib/consultation-api";
import { cn } from "@/lib/cn";

export default function LecturerConsultationPage() {
  return (
    <ProtectedPage
      title="Jadwal Bimbingan"
      description="Kelola jadwal konsultasi bimbingan untuk mahasiswa."
      allowedRoles={["DOSEN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [slots, setSlots] = useState<ConsultationSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    slot: ConsultationSlot | null;
  }>({ open: false, slot: null });
  const [isCancelling, setIsCancelling] = useState(false);

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    slot: ConsultationSlot | null;
  }>({ open: false, slot: null });
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    slot_date: "",
    start_time: "",
    end_time: "",
    max_bookings: 1,
    location: "",
    notes: "",
  });

  const [formData, setFormData] = useState({
    slot_date: "",
    start_time: "",
    end_time: "",
    max_bookings: 1,
    location: "",
    notes: "",
  });

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await listLecturerSlots(token);
      setSlots(res.data?.items ?? []);
    } catch (err) {
      toast.error("Gagal memuat jadwal", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    if (!formData.slot_date || !formData.start_time || !formData.end_time) {
      toast.error("Tanggal dan waktu wajib diisi");
      return;
    }

    setIsCreating(true);
    try {
      await createSlot(token, {
        slot_date: formData.slot_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        max_bookings: formData.max_bookings || 1,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
      });
      toast.success("Jadwal berhasil dibuat");
      setShowCreateDialog(false);
      setFormData({
        slot_date: "",
        start_time: "",
        end_time: "",
        max_bookings: 1,
        location: "",
        notes: "",
      });
      load();
    } catch (err) {
      toast.error("Gagal membuat jadwal", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCancel() {
    if (!cancelDialog.slot) return;
    const token = getAccessToken();
    if (!token) return;

    setIsCancelling(true);
    try {
      await cancelSlot(token, cancelDialog.slot.id);
      toast.success("Jadwal berhasil dibatalkan");
      setCancelDialog({ open: false, slot: null });
      load();
    } catch (err) {
      toast.error("Gagal membatalkan jadwal", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsCancelling(false);
    }
  }

  function handleOpenEdit(slot: ConsultationSlot) {
    setEditDialog({ open: true, slot });
    setEditFormData({
      slot_date: slot.slotDate,
      start_time: slot.startTime,
      end_time: slot.endTime,
      max_bookings: slot.maxBookings,
      location: slot.location,
      notes: slot.notes,
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editDialog.slot) return;
    const token = getAccessToken();
    if (!token) return;

    if (!editFormData.slot_date || !editFormData.start_time || !editFormData.end_time) {
      toast.error("Tanggal dan waktu wajib diisi");
      return;
    }

    setIsEditing(true);
    try {
      await updateSlot(token, editDialog.slot.id, {
        slot_date: editFormData.slot_date,
        start_time: editFormData.start_time,
        end_time: editFormData.end_time,
        max_bookings: editFormData.max_bookings || 1,
        location: editFormData.location || undefined,
        notes: editFormData.notes || undefined,
      });
      toast.success("Jadwal berhasil diperbarui");
      setEditDialog({ open: false, slot: null });
      load();
    } catch (err) {
      toast.error("Gagal memperbarui jadwal", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsEditing(false);
    }
  }

  // Group slots by date
  const slotsByDate = slots.reduce(
    (acc, slot) => {
      const date = slot.slotDate;
      if (!acc[date]) acc[date] = [];
      acc[date].push(slot);
      return acc;
    },
    {} as Record<string, ConsultationSlot[]>
  );

  const sortedDates = Object.keys(slotsByDate).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 size-4" />
          Buat Jadwal
        </Button>
        <Button variant="secondary" size="icon" onClick={() => load()}>
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Calendar className="size-5" />}
            title="Belum ada jadwal bimbingan"
            description="Buat jadwal bimbingan agar mahasiswa dapat melakukan booking."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h3 className="mb-3 text-sm font-medium text-text-secondary">
                {formatDateHeader(date)}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {slotsByDate[date].map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    onEdit={() => handleOpenEdit(slot)}
                    onCancel={() => setCancelDialog({ open: true, slot })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Jadwal Bimbingan</DialogTitle>
            <DialogDescription>
              Tentukan waktu dan lokasi untuk sesi bimbingan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="slot_date">Tanggal</Label>
                <Input
                  id="slot_date"
                  type="date"
                  value={formData.slot_date}
                  onChange={(e) =>
                    setFormData({ ...formData, slot_date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Jam Mulai</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">Jam Selesai</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_bookings">Kuota Mahasiswa</Label>
                <Input
                  id="max_bookings"
                  type="number"
                  min={1}
                  value={formData.max_bookings}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_bookings: parseInt(e.target.value) || 1,
                    })
                  }
                />
                <p className="text-xs text-text-muted">
                  1 untuk bimbingan individu, lebih untuk bimbingan kelompok.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Lokasi (opsional)</Label>
                <Input
                  id="location"
                  placeholder="Ruang 301 / Link Zoom"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan (opsional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Informasi tambahan untuk mahasiswa..."
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateDialog(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialog.open}
        onOpenChange={(open) => {
          if (!open) setCancelDialog({ open: false, slot: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Jadwal?</DialogTitle>
            <DialogDescription>
              Jadwal pada {cancelDialog.slot?.slotDate} pukul{" "}
              {cancelDialog.slot?.startTime} - {cancelDialog.slot?.endTime} akan
              dibatalkan. Semua booking yang sudah ada akan otomatis dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setCancelDialog({ open: false, slot: null })}
            >
              Tidak
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? "Membatalkan..." : "Ya, Batalkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => {
        if (!open) setEditDialog({ open: false, slot: null });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Jadwal Bimbingan</DialogTitle>
            <DialogDescription>
              Perbarui waktu dan lokasi untuk sesi bimbingan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_slot_date">Tanggal</Label>
                <Input
                  id="edit_slot_date"
                  type="date"
                  value={editFormData.slot_date}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, slot_date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_start_time">Jam Mulai</Label>
                  <Input
                    id="edit_start_time"
                    type="time"
                    value={editFormData.start_time}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, start_time: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_end_time">Jam Selesai</Label>
                  <Input
                    id="edit_end_time"
                    type="time"
                    value={editFormData.end_time}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, end_time: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_max_bookings">Kuota Mahasiswa</Label>
                <Input
                  id="edit_max_bookings"
                  type="number"
                  min={1}
                  value={editFormData.max_bookings}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      max_bookings: parseInt(e.target.value) || 1,
                    })
                  }
                />
                <p className="text-xs text-text-muted">
                  1 untuk bimbingan individu, lebih untuk bimbingan kelompok.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_location">Lokasi (opsional)</Label>
                <Input
                  id="edit_location"
                  placeholder="Ruang 301 / Link Zoom"
                  value={editFormData.location}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, location: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_notes">Catatan (opsional)</Label>
                <Textarea
                  id="edit_notes"
                  placeholder="Informasi tambahan untuk mahasiswa..."
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditDialog({ open: false, slot: null })}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SlotCard({
  slot,
  onEdit,
  onCancel,
}: {
  slot: ConsultationSlot;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const isFull = slot.currentBookings >= slot.maxBookings;
  const isPast = new Date(slot.slotDate) < new Date(new Date().toDateString());

  return (
    <Card
      className={cn(
        "p-4",
        slot.isCancelled && "opacity-50",
        isPast && !slot.isCancelled && "bg-bg-subtle"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <Clock className="size-4 text-text-muted" />
            {slot.startTime} - {slot.endTime}
          </div>
          {slot.location && (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <MapPin className="size-3.5 text-text-muted" />
              {slot.location}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Users className="size-3.5" />
            {slot.currentBookings}/{slot.maxBookings} booking
            {isFull && (
              <span className="rounded bg-status-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-status-warning">
                Penuh
              </span>
            )}
          </div>
          {slot.notes && (
            <p className="text-xs text-text-muted line-clamp-2">{slot.notes}</p>
          )}
        </div>
        {!slot.isCancelled && !isPast && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="text-text-muted hover:text-text-primary"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-status-error hover:text-status-error"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}
      </div>
      {slot.isCancelled && (
        <div className="mt-2 rounded bg-status-error/10 px-2 py-1 text-center text-xs font-medium text-status-error">
          Dibatalkan
        </div>
      )}
    </Card>
  );
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Hari Ini";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return "Besok";
  }

  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
