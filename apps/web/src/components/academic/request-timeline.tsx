"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleDot, Clock } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAcademicRequestHistory,
  type RequestStatusHistoryItem,
} from "@/lib/academic-api";

type Props = {
  token: string;
  requestId: string;
};

/**
 * Timeline (FR-259) — visual jejak status pengajuan akademik. Mengonsumsi
 * /api/v1/academic-requests/{id}/history yang sudah ada.
 */
export function RequestTimeline({ token, requestId }: Props) {
  const [items, setItems] = useState<RequestStatusHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");

    getAcademicRequestHistory(token, requestId)
      .then((res) => {
        if (cancelled) return;
        setItems(res.data?.histories ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Gagal memuat timeline",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, requestId]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="size-7 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-[12.5px] text-text-muted">
        Tidak dapat memuat timeline: {error}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-[12.5px] text-text-muted">
        Belum ada perubahan status.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {items.map((it, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <li key={it.id} className="relative flex items-start gap-3">
            {/* Connector line — extends down to next entry */}
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-3.5 top-7 h-[calc(100%+0.5rem)] w-px bg-border"
              />
            )}
            <span
              className={
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-surface " +
                (isLast
                  ? "border-accent text-accent"
                  : "border-border text-text-muted")
              }
            >
              {isLast ? (
                <CircleDot className="size-3.5" />
              ) : (
                <CircleCheck className="size-3.5" />
              )}
            </span>

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                {it.oldStatus && (
                  <span className="text-[11.5px] text-text-muted">
                    dari{" "}
                    <span className="font-mono">{it.oldStatus}</span> →
                  </span>
                )}
                <StatusBadge status={it.newStatus} />
              </div>
              <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-text-muted">
                <Clock className="size-3" />
                {formatDateTime(it.createdAt)}
              </p>
              {it.note && (
                <p className="mt-2 rounded-md border border-border bg-background-alt p-2.5 text-[12.5px] leading-relaxed text-text-secondary">
                  {it.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function formatDateTime(s: string): string {
  if (!s) return "—";
  const iso = s.replace(" ", "T");
  const d = new Date(iso);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
