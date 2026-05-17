import { Badge, type BadgeProps } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  DRAFT: "Draf",
  SUBMITTED: "Diajukan",
  VERIFIED: "Diverifikasi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  REVISION_REQUIRED: "Perlu Revisi",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  ASSIGNED: "Ditugaskan",
  ACCEPTED: "Diterima",
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  PENDING_BIND: "Belum Terhubung",
};

const VARIANTS: Record<string, BadgeProps["variant"]> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  VERIFIED: "accent",
  APPROVED: "success",
  REJECTED: "danger",
  REVISION_REQUIRED: "warning",
  COMPLETED: "completed",
  CANCELLED: "neutral",
  ASSIGNED: "assigned",
  ACCEPTED: "success",
  ACTIVE: "success",
  INACTIVE: "neutral",
  PENDING_BIND: "warning",
};

type Props = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: Props) {
  const upper = status.toUpperCase();
  const label = LABELS[upper] ?? status;
  const variant = VARIANTS[upper] ?? "neutral";

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
