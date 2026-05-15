/**
 * Workflow status badge — uses the `.status-{STATUS}` classes from globals.css
 * which map to the design tokens for each workflow state.
 */

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
};

type Props = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className = "" }: Props) {
  const upper = status.toUpperCase();
  const label = LABELS[upper] ?? status;
  const statusClass = `status-${upper}`;

  return (
    <span className={`status-badge ${statusClass} ${className}`.trim()}>
      {label}
    </span>
  );
}
