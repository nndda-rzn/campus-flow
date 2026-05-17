import { cn } from "@/lib/cn";

type Props = {
  dueAt: string | null | undefined;
  status: string;
  className?: string;
};

const TERMINAL_STATUSES = new Set([
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
]);

/**
 * SLABadge shows the remaining time until due_at for a request that is still
 * in-flight. Once the request has reached a terminal status (completed,
 * rejected, cancelled), the badge is hidden — the SLA no longer applies.
 *
 * Severity:
 *   - red:   already overdue
 *   - amber: < 24h remaining
 *   - slate: > 24h remaining
 */
export function SLABadge({ dueAt, status, className }: Props) {
  if (!dueAt || TERMINAL_STATUSES.has(status.toUpperCase())) {
    return null;
  }

  const due = parseDate(dueAt);
  if (!due) return null;

  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const overdue = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const hours = Math.floor(absMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  let label: string;
  if (overdue) {
    label = days > 0 ? `Telat ${days}h` : `Telat ${hours}j`;
  } else if (hours < 24) {
    label = `Sisa ${hours}j`;
  } else {
    label = `Sisa ${days}h`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium tabular-nums leading-tight",
        overdue && "border-danger bg-danger-soft text-danger-text",
        !overdue && hours < 24 && "border-warning bg-warning-soft text-warning-text",
        !overdue && hours >= 24 && "border-border bg-background-alt text-text-secondary",
        className,
      )}
      title={`SLA: ${formatFull(due)}`}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          overdue && "bg-danger",
          !overdue && hours < 24 && "bg-warning",
          !overdue && hours >= 24 && "bg-text-disabled",
        )}
      />
      {label}
    </span>
  );
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const iso = s.replace(" ", "T");
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function formatFull(d: Date): string {
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
