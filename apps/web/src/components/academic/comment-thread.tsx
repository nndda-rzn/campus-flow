"use client";

import { FormEvent, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccessToken } from "@/lib/auth-storage";
import {
  createRequestComment,
  listRequestComments,
  type RequestComment,
} from "@/lib/comment-bulk-api";
import { cn } from "@/lib/cn";

type Props = {
  requestType: "ACADEMIC" | "SUPERVISOR";
  requestId: string;
};

const ROLE_TINT: Record<string, string> = {
  MAHASISWA: "bg-info-soft text-info-text",
  ADMIN_PRODI: "bg-accent-soft text-accent",
  KAPRODI: "bg-warning-soft text-warning-text",
  TATA_USAHA: "bg-success-soft text-success-text",
  DOSEN: "bg-primary-soft text-text-primary",
  SUPER_ADMIN: "bg-danger-soft text-danger-text",
};

/**
 * Comment thread (FR-260). Append-only chat per pengajuan. Used in detail
 * panels of academic-requests and supervisor-requests. Authentication is
 * already enforced by ProtectedPage; the API also validates server-side.
 */
export function CommentThread({ requestType, requestId }: Props) {
  const [items, setItems] = useState<RequestComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await listRequestComments(token, requestType, requestId);
      setItems(res.data?.items ?? []);
    } catch (err) {
      toast.error("Gagal memuat diskusi", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, requestType]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = body.trim();
    if (trimmed === "") return;
    if (trimmed.length > 4000) {
      toast.error("Maksimal 4000 karakter");
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    setIsSending(true);
    try {
      await createRequestComment(token, {
        request_type: requestType,
        request_id: requestId,
        body: trimmed,
      });
      setBody("");
      await load();
    } catch (err) {
      toast.error("Gagal mengirim komentar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-[12.5px] text-text-muted">
          Belum ada diskusi. Tulis pesan pertama untuk mahasiswa atau tim
          administrasi.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((c) => {
            const tint = ROLE_TINT[c.authorRole] ?? "bg-background-alt text-text-secondary";
            return (
              <li
                key={c.id}
                className="rounded-md border border-border bg-surface p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]",
                      tint,
                    )}
                  >
                    {c.authorRole.replace("_", " ")}
                  </span>
                  <span className="font-mono text-[10.5px] text-text-muted">
                    {c.authorUserId.slice(0, 8)}…
                  </span>
                  <span className="ml-auto text-[10.5px] text-text-muted">
                    {formatDateTime(c.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-text-secondary">
                  {c.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tulis pesan untuk peserta diskusi…"
          className="min-h-20"
          maxLength={4000}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={isSending} disabled={body.trim() === ""}>
            <Send className="size-3.5" />
            Kirim
          </Button>
        </div>
      </form>
    </div>
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
    hour: "2-digit",
    minute: "2-digit",
  });
}
