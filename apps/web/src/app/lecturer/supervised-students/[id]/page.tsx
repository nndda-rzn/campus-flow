"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  RefreshCw,
  User,
  BookOpen,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getAccessToken } from "@/lib/auth-storage";
import {
  SupervisedStudentProgress,
  ThesisProgressItem,
  getStudentProgressDetail,
  completeMilestone,
} from "@/lib/thesis-api";
import { cn } from "@/lib/cn";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function StudentProgressDetailPage({ params }: PageProps) {
  const { id } = use(params);

  return (
    <ProtectedPage
      title="Detail Progress Mahasiswa"
      description="Lihat dan kelola progress skripsi mahasiswa bimbingan Anda."
      allowedRoles={["DOSEN"]}
    >
      <PageContent studentUserId={id} />
    </ProtectedPage>
  );
}

function PageContent({ studentUserId }: { studentUserId: string }) {
  const router = useRouter();
  const [student, setStudent] = useState<SupervisedStudentProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completeDialog, setCompleteDialog] = useState<{
    open: boolean;
    progress: ThesisProgressItem | null;
  }>({ open: false, progress: null });
  const [completeNotes, setCompleteNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await getStudentProgressDetail(token, studentUserId);
      if (res.data) {
        setStudent(res.data);
      }
    } catch (err) {
      toast.error("Gagal memuat data progress", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentUserId]);

  async function handleComplete() {
    if (!completeDialog.progress) return;

    const token = getAccessToken();
    if (!token) return;

    setIsCompleting(true);
    try {
      await completeMilestone(token, completeDialog.progress.id, completeNotes);
      toast.success("Milestone berhasil ditandai selesai");
      setCompleteDialog({ open: false, progress: null });
      setCompleteNotes("");
      load();
    } catch (err) {
      toast.error("Gagal menandai milestone selesai", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsCompleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 size-4" />
          Kembali
        </Button>
        <Card className="p-8 text-center">
          <p className="text-text-muted">
            Mahasiswa tidak ditemukan atau Anda bukan pembimbing mahasiswa ini.
          </p>
        </Card>
      </div>
    );
  }

  const completedCount = student.progress?.filter((p) => p.status === "COMPLETED").length ?? 0;
  const totalCount = student.progress?.length ?? 0;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 size-4" />
          Kembali
        </Button>
        <Button variant="secondary" size="sm" onClick={() => load()}>
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      {/* Student Info Card */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent-primary/10">
                <User className="size-6 text-accent-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  {student.studentName}
                </h2>
                <p className="font-mono text-sm text-text-muted">
                  {student.studentNim}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BookOpen className="mt-0.5 size-4 text-text-muted" />
              <p className="text-sm text-text-secondary">{student.topicTitle}</p>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-2xl font-bold text-accent-primary">{percentage}%</p>
              <p className="text-xs text-text-muted">
                {completedCount} dari {totalCount} milestone
              </p>
            </div>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-bg-subtle">
              <div
                className={cn(
                  "h-full transition-all",
                  percentage === 100 ? "bg-status-success" : "bg-accent-primary"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Progress Timeline */}
      <Card className="p-5">
        <h3 className="mb-4 text-base font-semibold text-text-primary">
          Timeline Progress
        </h3>
        <div className="space-y-1">
          {student.progress?.map((p, index) => (
            <MilestoneItem
              key={p.id}
              progress={p}
              isLast={index === (student.progress?.length ?? 0) - 1}
              onComplete={() => {
                setCompleteDialog({ open: true, progress: p });
              }}
            />
          ))}
        </div>
      </Card>

      {/* Complete Dialog */}
      <Dialog
        open={completeDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteDialog({ open: false, progress: null });
            setCompleteNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tandai Milestone Selesai</DialogTitle>
            <DialogDescription>
              Anda akan menandai milestone &quot;{completeDialog.progress?.milestoneName}&quot; sebagai
              selesai. Tambahkan catatan jika diperlukan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Catatan (opsional)..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setCompleteDialog({ open: false, progress: null })}
            >
              Batal
            </Button>
            <Button onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? "Menyimpan..." : "Tandai Selesai"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MilestoneItem({
  progress,
  isLast,
  onComplete,
}: {
  progress: ThesisProgressItem;
  isLast: boolean;
  onComplete: () => void;
}) {
  const isCompleted = progress.status === "COMPLETED";
  const isInProgress = progress.status === "IN_PROGRESS";

  return (
    <div className="flex gap-4">
      {/* Timeline indicator */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            isCompleted
              ? "bg-status-success text-white"
              : isInProgress
                ? "bg-accent-primary text-white"
                : "bg-bg-subtle text-text-muted"
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="size-4" />
          ) : isInProgress ? (
            <Clock className="size-4" />
          ) : (
            <Circle className="size-4" />
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-0.5 flex-1 min-h-[40px]",
              isCompleted ? "bg-status-success" : "bg-border-default"
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h4
                className={cn(
                  "font-medium",
                  isCompleted
                    ? "text-text-primary"
                    : isInProgress
                      ? "text-accent-primary"
                      : "text-text-muted"
                )}
              >
                {progress.milestoneName}
              </h4>
              <span className="rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
                {progress.milestoneCode}
              </span>
            </div>

            {/* Meta info */}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
              {progress.targetDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  Target: {formatDate(progress.targetDate)}
                </span>
              )}
              {progress.completedAt && (
                <span className="flex items-center gap-1 text-status-success">
                  <CheckCircle2 className="size-3" />
                  Selesai: {formatDate(progress.completedAt)}
                </span>
              )}
            </div>

            {/* Notes */}
            {progress.notes && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-text-secondary">
                <MessageSquare className="mt-0.5 size-3" />
                <p>{progress.notes}</p>
              </div>
            )}
          </div>

          {/* Action */}
          {!isCompleted && (
            <Button variant="secondary" size="sm" onClick={onComplete}>
              <CheckCircle2 className="mr-1.5 size-3.5" />
              Selesai
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  const isoLike = dateStr.replace(" ", "T");
  const date = new Date(isoLike);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
