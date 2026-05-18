"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Check,
  Clock,
  RefreshCw,
  X,
  ArrowRightLeft,
  MessageSquare,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAccessToken } from "@/lib/auth-storage";
import {
  ConsultationBooking,
  ConsultationSlot,
  listLecturerBookings,
  listLecturerSlots,
  approveBooking,
  rejectBooking,
  rescheduleBooking,
} from "@/lib/consultation-api";
import { cn } from "@/lib/cn";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
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

export default function LecturerBookingsPage() {
  return (
    <ProtectedPage
      title="Booking Bimbingan"
      description="Kelola permintaan booking bimbingan dari mahasiswa."
      allowedRoles={["DOSEN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [bookings, setBookings] = useState<ConsultationBooking[]>([]);
  const [slots, setSlots] = useState<ConsultationSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    booking: ConsultationBooking | null;
    action: "approve" | "reject" | "reschedule" | null;
  }>({ open: false, booking: null, action: null });
  const [actionNotes, setActionNotes] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const [bookingsRes, slotsRes] = await Promise.all([
        listLecturerBookings(token, statusFilter === "ALL" ? undefined : statusFilter),
        listLecturerSlots(token),
      ]);
      setBookings(bookingsRes.data?.items ?? []);
      setSlots(slotsRes.data?.items ?? []);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleAction() {
    if (!actionDialog.booking || !actionDialog.action) return;
    const token = getAccessToken();
    if (!token) return;

    setIsProcessing(true);
    try {
      if (actionDialog.action === "approve") {
        await approveBooking(token, actionDialog.booking.id, actionNotes);
        toast.success("Booking disetujui");
      } else if (actionDialog.action === "reject") {
        await rejectBooking(token, actionDialog.booking.id, actionNotes);
        toast.success("Booking ditolak");
      } else if (actionDialog.action === "reschedule") {
        if (!selectedSlotId) {
          toast.error("Pilih jadwal alternatif");
          setIsProcessing(false);
          return;
        }
        await rescheduleBooking(
          token,
          actionDialog.booking.id,
          selectedSlotId,
          actionNotes
        );
        toast.success("Jadwal alternatif diusulkan");
      }
      setActionDialog({ open: false, booking: null, action: null });
      setActionNotes("");
      setSelectedSlotId("");
      load();
    } catch (err) {
      toast.error("Gagal memproses booking", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsProcessing(false);
    }
  }

  const availableSlots = slots.filter(
    (s) =>
      !s.isCancelled &&
      new Date(s.slotDate) >= new Date(new Date().toDateString()) &&
      s.currentBookings < s.maxBookings
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua</SelectItem>
            <SelectItem value="PENDING">Menunggu</SelectItem>
            <SelectItem value="APPROVED">Disetujui</SelectItem>
            <SelectItem value="REJECTED">Ditolak</SelectItem>
            <SelectItem value="RESCHEDULED">Dijadwalkan Ulang</SelectItem>
            <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" size="icon" onClick={() => load()}>
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Calendar className="size-5" />}
            title="Tidak ada booking"
            description={
              statusFilter === "PENDING"
                ? "Belum ada permintaan booking dari mahasiswa."
                : "Tidak ada booking dengan status ini."
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onApprove={() =>
                setActionDialog({ open: true, booking, action: "approve" })
              }
              onReject={() =>
                setActionDialog({ open: true, booking, action: "reject" })
              }
              onReschedule={() =>
                setActionDialog({ open: true, booking, action: "reschedule" })
              }
            />
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ open: false, booking: null, action: null });
            setActionNotes("");
            setSelectedSlotId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "approve" && "Setujui Booking"}
              {actionDialog.action === "reject" && "Tolak Booking"}
              {actionDialog.action === "reschedule" && "Usulkan Jadwal Lain"}
            </DialogTitle>
            <DialogDescription>
              Booking dari {actionDialog.booking?.studentName} untuk{" "}
              {actionDialog.booking?.slotDate} pukul{" "}
              {actionDialog.booking?.startTime}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {actionDialog.action === "reschedule" && (
              <div className="space-y-2">
                <Label>Pilih Jadwal Alternatif</Label>
                <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jadwal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSlots.length === 0 ? (
                      <SelectItem value="" disabled>
                        Tidak ada jadwal tersedia
                      </SelectItem>
                    ) : (
                      availableSlots.map((slot) => (
                        <SelectItem key={slot.id} value={slot.id}>
                          {slot.slotDate} | {slot.startTime} - {slot.endTime}
                          {slot.location && ` | ${slot.location}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={
                  actionDialog.action === "reject"
                    ? "Alasan penolakan..."
                    : "Catatan untuk mahasiswa..."
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() =>
                setActionDialog({ open: false, booking: null, action: null })
              }
            >
              Batal
            </Button>
            <Button
              variant={actionDialog.action === "reject" ? "danger" : "primary"}
              onClick={handleAction}
              disabled={isProcessing}
            >
              {isProcessing
                ? "Memproses..."
                : actionDialog.action === "approve"
                  ? "Setujui"
                  : actionDialog.action === "reject"
                    ? "Tolak"
                    : "Usulkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookingCard({
  booking,
  onApprove,
  onReject,
  onReschedule,
}: {
  booking: ConsultationBooking;
  onApprove: () => void;
  onReject: () => void;
  onReschedule: () => void;
}) {
  const isPending = booking.status === "PENDING";

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">
              {booking.studentName}
            </span>
            <span className="text-xs font-mono text-text-muted">
              {booking.studentNim}
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
              <span className="text-text-muted">{booking.location}</span>
            )}
          </div>
          <div className="flex items-start gap-1.5 text-xs text-text-secondary">
            <MessageSquare className="mt-0.5 size-3.5 shrink-0" />
            <p className="line-clamp-2">{booking.topic}</p>
          </div>
          {booking.lecturerNotes && (
            <p className="text-xs text-text-muted italic">
              Catatan: {booking.lecturerNotes}
            </p>
          )}
        </div>

        {isPending && (
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={onReschedule}>
              <ArrowRightLeft className="mr-1.5 size-3.5" />
              Reschedule
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReject}
              className="text-status-error hover:text-status-error"
            >
              <X className="mr-1.5 size-3.5" />
              Tolak
            </Button>
            <Button variant="primary" size="sm" onClick={onApprove}>
              <Check className="mr-1.5 size-3.5" />
              Setujui
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
