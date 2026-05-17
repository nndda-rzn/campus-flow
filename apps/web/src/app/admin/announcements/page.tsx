"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Megaphone, Pencil, Plus, Power, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAccessToken } from "@/lib/auth-storage";
import {
  Announcement,
  AnnouncementSeverity,
  createAnnouncement,
  deactivateAnnouncement,
  listAnnouncements,
  updateAnnouncement,
} from "@/lib/announcement-api";
import { cn } from "@/lib/cn";

const SEVERITIES: AnnouncementSeverity[] = [
  "INFO",
  "SUCCESS",
  "WARNING",
  "CRITICAL",
];

const ROLE_OPTIONS = [
  "MAHASISWA",
  "DOSEN",
  "ADMIN_PRODI",
  "KAPRODI",
  "TATA_USAHA",
  "SUPER_ADMIN",
];

const SEVERITY_VARIANT: Record<AnnouncementSeverity, "info" | "success" | "warning" | "danger"> = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  CRITICAL: "danger",
};

export default function AdminAnnouncementsPage() {
  return (
    <ProtectedPage
      title="Pengumuman"
      description="Kirim pengumuman resmi ke role tertentu. Pengumuman aktif akan tampil di banner dashboard pengguna terkait."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<AnnouncementSeverity>("INFO");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [endsAt, setEndsAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await listAnnouncements(token, { includeInactive: true });
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

  function openCreate() {
    setCreateOpen(true);
    setEditTarget(null);
    setTitle("");
    setBody("");
    setSeverity("INFO");
    setTargetRoles([]);
    setEndsAt("");
    setFormError("");
  }

  function openEdit(a: Announcement) {
    setCreateOpen(false);
    setEditTarget(a);
    setTitle(a.title);
    setBody(a.body);
    setSeverity(a.severity);
    setTargetRoles(a.targetRoles);
    setEndsAt(a.endsAt);
    setFormError("");
  }

  function close() {
    setCreateOpen(false);
    setEditTarget(null);
    setFormError("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (title.trim() === "" || body.trim() === "") {
      setFormError("Judul dan isi pengumuman wajib diisi.");
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    setIsSaving(true);
    setFormError("");
    try {
      if (editTarget) {
        await updateAnnouncement(token, {
          id: editTarget.id,
          title: title.trim(),
          body: body.trim(),
          severity,
          target_roles: targetRoles,
          ends_at: endsAt || undefined,
        });
        toast.success("Pengumuman diperbarui");
      } else {
        await createAnnouncement(token, {
          title: title.trim(),
          body: body.trim(),
          severity,
          target_roles: targetRoles,
          ends_at: endsAt || undefined,
        });
        toast.success("Pengumuman dipublikasikan");
      }
      close();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate(a: Announcement) {
    const token = getAccessToken();
    if (!token) return;
    try {
      await deactivateAnnouncement(token, a.id);
      toast.success("Pengumuman dinonaktifkan");
      await load();
    } catch (err) {
      toast.error("Gagal menonaktifkan", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  function toggleRole(role: string) {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      ),
    [items],
  );

  const dialogOpen = createOpen || editTarget !== null;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-3.5" />
            Buat Pengumuman
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Megaphone className="size-4" />}
              title="Belum ada pengumuman"
              description="Klik 'Buat Pengumuman' untuk memublikasikan pengumuman resmi."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {sorted.map((a) => (
              <Card key={a.id} className="card-padded">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[a.severity]}>
                        {a.severity}
                      </Badge>
                      {!a.isActive && <Badge variant="neutral">Nonaktif</Badge>}
                      <h3 className="font-display text-[16px] font-semibold tracking-tight text-text-primary">
                        {a.title}
                      </h3>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-text-secondary">
                      {a.body}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-text-muted">
                      <span>
                        oleh{" "}
                        <span className="font-medium text-text-secondary">
                          {a.authorName || "Admin"}
                        </span>
                      </span>
                      <span>·</span>
                      <span>{formatDate(a.startsAt)}</span>
                      {a.endsAt && (
                        <>
                          <span>·</span>
                          <span>berakhir {formatDate(a.endsAt)}</span>
                        </>
                      )}
                      {a.targetRoles.length > 0 && (
                        <>
                          <span>·</span>
                          <span>untuk: {a.targetRoles.join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    {a.isActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeactivate(a)}
                        aria-label="Nonaktifkan"
                      >
                        <Power className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Ubah Pengumuman" : "Buat Pengumuman Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ann-title">Judul</Label>
                <Input
                  id="ann-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-body">Isi Pengumuman</Label>
                <Textarea
                  id="ann-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-32"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ann-severity">Tingkat</Label>
                  <Select
                    value={severity}
                    onValueChange={(v) => setSeverity(v as AnnouncementSeverity)}
                  >
                    <SelectTrigger id="ann-severity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ann-ends">
                    Berakhir{" "}
                    <span className="font-normal text-text-muted">(opsional)</span>
                  </Label>
                  <Input
                    id="ann-ends"
                    type="datetime-local"
                    value={endsAt.replace(" ", "T").slice(0, 16)}
                    onChange={(e) => setEndsAt(e.target.value.replace("T", " ") + ":00")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Role</Label>
                <p className="text-[11.5px] text-text-muted">
                  Kosongkan untuk broadcast ke semua role.
                </p>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((r) => {
                    const active = targetRoles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRole(r)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors",
                          active
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-border bg-surface text-text-secondary hover:border-text-muted",
                        )}
                      >
                        {r.replace("_", " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
              {formError && (
                <p className="text-[12.5px] text-danger">{formError}</p>
              )}
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isSaving}>
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" loading={isSaving}>
                <Megaphone className="size-3.5" />
                {editTarget ? "Simpan Perubahan" : "Publikasikan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatDate(s: string): string {
  if (!s) return "—";
  const iso = s.replace(" ", "T");
  const d = new Date(iso);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
