"use client";

import { useEffect, useState } from "react";
import { Megaphone, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getAccessToken } from "@/lib/auth-storage";
import {
  Announcement,
  AnnouncementSeverity,
  listAnnouncements,
} from "@/lib/announcement-api";
import { cn } from "@/lib/cn";

const SEVERITY_VARIANT: Record<
  AnnouncementSeverity,
  "info" | "success" | "warning" | "danger"
> = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  CRITICAL: "danger",
};

const SEVERITY_LABEL: Record<AnnouncementSeverity, string> = {
  INFO: "Informasi",
  SUCCESS: "Sukses",
  WARNING: "Peringatan",
  CRITICAL: "Penting",
};

export default function LecturerAnnouncementsPage() {
  return (
    <ProtectedPage
      title="Pengumuman"
      description="Pengumuman resmi dari administrasi program studi."
      allowedRoles={["DOSEN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await listAnnouncements(token, { includeInactive: false });
      setItems(res.data?.items ?? []);
    } catch (err) {
      toast.error("Gagal memuat pengumuman", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeItems = items.filter((a) => a.isActive);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="secondary" size="icon" onClick={() => load()}>
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : activeItems.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Megaphone className="size-5" />}
            title="Belum ada pengumuman"
            description="Pengumuman dari administrasi akan muncul di sini."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {activeItems.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const variant = SEVERITY_VARIANT[announcement.severity];
  const label = SEVERITY_LABEL[announcement.severity];

  return (
    <Card
      className={cn(
        "p-4",
        announcement.severity === "CRITICAL" && "border-status-error",
        announcement.severity === "WARNING" && "border-status-warning",
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={variant}>{label}</Badge>
              {announcement.targetRoles.length > 0 && (
                <span className="text-xs text-text-muted">
                  untuk {announcement.targetRoles.join(", ")}
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-text-primary">
              {announcement.title}
            </h3>
          </div>
        </div>

        <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
          {announcement.body}
        </p>

        <div className="flex items-center gap-4 border-t border-border pt-3 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Dari:</span>
            <span>{announcement.authorName || "Admin"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Dibuat:</span>
            <span>{formatDate(announcement.createdAt)}</span>
          </div>
          {announcement.endsAt && (
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Berlaku hingga:</span>
              <span>{formatDate(announcement.endsAt)}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
