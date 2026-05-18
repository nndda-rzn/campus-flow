"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  User,
  MessageSquare,
  Check,
  X,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getAccessToken } from "@/lib/auth-storage";
import {
  ConsultationSlot,
  ConsultationBooking,
  listAvailableSlots,
  listStudentBookings,
  createBooking,
  cancelBooking,
  acceptReschedule,
} from "@/lib/consultation-api";
import { cn } from "@/lib/cn";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu Konfirmasi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
  RESCHEDULED: "Dijadwalkan Ulang",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-status-warning/10 text-status-warning",
  APPROVED: "bg-status-success/10 text-status-success",
  REJECTED: "bg-status-error/10 text-status-error",
  CANCELLED: "bg-bg-subtle text-text-muted",
  RESCHEDULED: "bg-accent-primary/10 text-accent-primary",
};

export default function StudentConsultationPage() {
  return (
    <ProtectedPage
      title="Konsultasi Bimbingan"
      description="Booking jadwal konsultasi dengan dosen pembimbing Anda."
      allowedRoles={["MAHASISWA"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [slots, setSlots] = useState<ConsultationSlot[]>([]);
  const [bookings, setBookings] = useState<ConsultationBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [bookDialog, setBookDialog] = useState<{
    open: boolean;
    slot: ConsultationSlot | null;
  }>({ open: false, slot: null });
  const [topic, setTopic] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    booking: ConsultationBooking | null;
  }>({ open: false, booking: null });
  const [isCancelling, setIsCancelling] = useState(false);

  const [rescheduleDialog, setRescheduleDialog] = useState<{
    open: boolean;
    booking: ConsultationBooking | null;
  }>({ open: false, booking: null });
  const [isAccepting, setIsAccepting] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const [slotsRes, bookingsRes] = await Promise.all([
        listAvailableSlots(token),
        listStudentBookings(token),
      ]);
      setSlots(slotsRes.data?.items ?? []);
      setBookings(bookingsRes.data?.items ?? []);
    } catch (err) {
      toast.error("Gagal memuat data", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleBook() {
    if (!bookDialog.slot) return;
    const token = getAccessToken();
    if (!token) return;

    if (!topic.trim()) {
      toast.error("Topik wajib diisi");
      return;
    }

    setIsBooking(true);
    try {
      await createBooking(token, bookDialog.slot.id, topic);
      toast.success("Booking berhasil dibuat");
      setBookDialog({ open: false, slot: null });
      setTopic("");
      load();
    } catch (err) {
      toast.error("Gagal membuat booking", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsBooking(false);
    }
  }

  async function handleCancel() {
    if (!cancelDialog.booking) return;
    const token = getAccessToken();
    if (!token) return;

    setIsCancelling(true);
    try {
      await cancelBooking(token, cancelDialog.booking.id);
      toast.success("Booking dibatalkan");
      setCancelDialog({ open: false, booking: null });
      load();
    } catch (err) {
      toast.error("Gagal membatalkan booking", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleAcceptReschedule() {
    if (!rescheduleDialog.booking) return;
    const token = getAccessToken();
    if (!token) return;

    setIsAccepting(true);
    try {
      await acceptReschedule(token, rescheduleDialog.booking.id);
      toast.success("Jadwal baru diterima");
      setRescheduleDialog({ open: false, booking: null });
      load();
    } catch (err) {
      toast.error("Gagal menerima jadwal", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsAccepting(false);
    }
  }

  // Group slots by lecturer
  const slotsByLecturer = slots.reduce(
    (acc, slot) => {
      const name = slot.lecturerName || "Dosen";
      if (!acc[name]) acc[name] = [];
      acc[name].push(slot);
      return acc;
    },
    {} as Record<string, ConsultationSlot[]>
  );

  const activeBookings = bookings.filter(
    (b) => b.status === "PENDING" || b.status === "APPROVED" || b.status === "RESCHEDULED"
  );
  const historyBookings = bookings.filter(
    (b) => b.status === "REJECTED" || b.status === "CANCELLED"
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="secondary" size="icon" onClick={() => load()}>
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="available">
          <TabsList>
            <TabsTrigger value="available">Jadwal Tersedia</TabsTrigger>
            <TabsTrigger value="bookings">
              Booking Saya
              {activeBookings.length > 0 && (
                <span className="ml-1.5 rounded-full bg-accent-primary px-1.5 text-[10px] text-white">
                  {activeBookings.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Riwayat</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-4">
            {slots.length === 0 ? (
              <Card className="p-8">
                <EmptyState
                  icon={<Calendar className="size-5" />}
                  title="Tidak ada jadwal tersedia"
                  description="Dosen pembimbing Anda belum membuat jadwal bimbingan."
                />
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(slotsByLecturer).map(([lecturer, lecturerSlots]) => (
                  <div key={lecturer}>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-secondary">
                      <User className="size-4" />
                      {lecturer}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {lecturerSlots.map((slot) => (
                        <AvailableSlotCard
                          key={slot.id}
                          slot={slot}
                          onBook={() => setBookDialog({ open: true, slot })}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="mt-4">
            {activeBookings.length === 0 ? (
              <Card className="p-8">
                <EmptyState
                  icon={<Calendar className="size-5" />}
                  title="Belum ada booking aktif"
                  description="Pilih jadwal yang tersedia untuk membuat booking."
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {activeBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onCancel={() => setCancelDialog({ open: true, booking })}
                    onAcceptReschedule={() =>
                      setRescheduleDialog({ open: true, booking })
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {historyBookings.length === 0 ? (
              <Card className="p-8">
                <EmptyState
                  icon={<Calendar className="size-5" />}
                  title="Tidak ada riwayat"
                  description="Booking yang dibatalkan atau ditolak akan muncul di sini."
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {historyBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Book Dialog */}
      <Dialog
        open={bookDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setBookDialog({ open: false, slot: null });
            setTopic("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Bimbingan</DialogTitle>
            <DialogDescription>
              {bookDialog.slot?.slotDate} pukul {bookDialog.slot?.startTime} -{" "}
              {bookDialog.slot?.endTime}
              {bookDialog.slot?.location && ` di ${bookDialog.slot.location}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topik yang ingin dibahas</Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Jelaskan topik atau pertanyaan yang ingin Anda diskusikan..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setBookDialog({ open: false, slot: null })}
            >
              Batal
            </Button>
            <Button onClick={handleBook} disabled={isBooking}>
              {isBooking ? "Memproses..." : "Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog
        open={cancelDialog.open}
        onOpenChange={(open) => {
          if (!open) setCancelDialog({ open: false, booking: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Booking?</DialogTitle>
            <DialogDescription>
              Booking untuk {cancelDialog.booking?.slotDate} pukul{" "}
              {cancelDialog.booking?.startTime} akan dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setCancelDialog({ open: false, booking: null })}
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

      {/* Accept Reschedule Dialog */}
      <Dialog
        open={rescheduleDialog.open}
        onOpenChange={(open) => {
          if (!open) setRescheduleDialog({ open: false, booking: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terima Jadwal Baru?</DialogTitle>
            <DialogDescription>
              Dosen mengusulkan jadwal baru. Apakah Anda menerima?
            </DialogDescription>
          </DialogHeader>
          {rescheduleDialog.booking?.proposedSlot && (
            <div className="rounded-lg border border-border-default bg-bg-subtle p-4">
              <p className="text-sm font-medium text-text-primary">
                Jadwal Baru:
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {rescheduleDialog.booking.proposedSlot.slotDate} pukul{" "}
                {rescheduleDialog.booking.proposedSlot.startTime} -{" "}
                {rescheduleDialog.booking.proposedSlot.endTime}
              </p>
              {rescheduleDialog.booking.proposedSlot.location && (
                <p className="text-xs text-text-muted">
                  {rescheduleDialog.booking.proposedSlot.location}
                </p>
              )}
            </div>
          )}
          {rescheduleDialog.booking?.lecturerNotes && (
            <p className="text-sm text-text-muted italic">
              Catatan: {rescheduleDialog.booking.lecturerNotes}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                // Reject = cancel the booking
                if (rescheduleDialog.booking) {
                  setCancelDialog({ open: true, booking: rescheduleDialog.booking });
                }
                setRescheduleDialog({ open: false, booking: null });
              }}
            >
              Tolak
            </Button>
            <Button onClick={handleAcceptReschedule} disabled={isAccepting}>
              {isAccepting ? "Memproses..." : "Terima"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AvailableSlotCard({
  slot,
  onBook,
}: {
  slot: ConsultationSlot;
  onBook: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">
            {formatDate(slot.slotDate)}
          </span>
          <span className="text-xs text-text-muted">
            {slot.currentBookings}/{slot.maxBookings} terisi
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Clock className="size-4 text-text-muted" />
          {slot.startTime} - {slot.endTime}
        </div>
        {slot.location && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <MapPin className="size-3.5" />
            {slot.location}
          </div>
        )}
        {slot.notes && (
          <p className="text-xs text-text-muted line-clamp-2">{slot.notes}</p>
        )}
        <Button size="sm" className="mt-2 w-full" onClick={onBook}>
          Booking
        </Button>
      </div>
    </Card>
  );
}

function BookingCard({
  booking,
  onCancel,
  onAcceptReschedule,
}: {
  booking: ConsultationBooking;
  onCancel?: () => void;
  onAcceptReschedule?: () => void;
}) {
  const canCancel =
    (booking.status === "PENDING" || booking.status === "RESCHEDULED") &&
    onCancel;
  const isRescheduled = booking.status === "RESCHEDULED" && onAcceptReschedule;

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {booking.lecturerName}
            </span>
            <span
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium",
                STATUS_COLORS[booking.status]
              )}
            >
              {STATUS_LABELS[booking.status]}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {booking.slotDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {booking.startTime} - {booking.endTime}
            </span>
            {booking.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {booking.location}
              </span>
            )}
          </div>
          <div className="flex items-start gap-1.5 text-xs text-text-secondary">
            <MessageSquare className="mt-0.5 size-3.5 shrink-0" />
            <p className="line-clamp-2">{booking.topic}</p>
          </div>
          {booking.lecturerNotes && (
            <p className="text-xs text-text-muted italic">
              Catatan dosen: {booking.lecturerNotes}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          {isRescheduled && (
            <Button size="sm" onClick={onAcceptReschedule}>
              <ArrowRight className="mr-1.5 size-3.5" />
              Lihat Jadwal Baru
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-status-error hover:text-status-error"
            >
              <X className="mr-1.5 size-3.5" />
              Batalkan
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function formatDate(dateStr: string): string {
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
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
