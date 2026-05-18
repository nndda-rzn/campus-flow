"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { 
  getLecturerGuidanceLogs, 
  approveGuidanceLog,
  requestRevisionGuidanceLog,
  updateGuidanceLogNotes,
  attachFileToGuidanceLog,
  removeAttachmentFromGuidanceLog,
  GuidanceLogItem 
} from "@/lib/guidance-api";
import { getThesisMilestones, ThesisMilestoneItem } from "@/lib/thesis-api";
import { uploadFile } from "@/lib/file-api";
import { getAccessToken, getCurrentUser } from "@/lib/auth-storage";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, FileText, Trash2, MessageSquarePlus, Tag } from "lucide-react";

export default function LecturerGuidanceLogsPage() {
  const [logs, setLogs] = useState<GuidanceLogItem[]>([]);
  const [milestones, setMilestones] = useState<ThesisMilestoneItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<GuidanceLogItem | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REVISION">("APPROVE");
  const [feedback, setFeedback] = useState("");

  // Notes & milestone dialog
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; log: GuidanceLogItem | null }>({ open: false, log: null });
  const [notesValue, setNotesValue] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Attachment upload
  const [isUploading, setIsUploading] = useState(false);

  async function loadData() {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await getLecturerGuidanceLogs(token);
      setLogs(res.data?.items || []);
    } catch (err) {
      toast.error("Gagal memuat logbook", {
        description: err instanceof Error ? err.message : "Silakan coba lagi nanti",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMilestones() {
    const token = getAccessToken();
    const user = getCurrentUser();
    if (!token) return;

    try {
      // For lecturers, we can fetch all milestones for now, or just leave it empty if department is strictly required
      // We will try without departmentId first, if it fails, milestones will be empty
      const res = await getThesisMilestones(token, "");
      setMilestones(res.data?.items || []);
    } catch {
      // Silently fail - milestone tag is optional
    }
  }

  useEffect(() => {
    loadData();
    loadMilestones();
  }, []);

  function handleOpenAction(log: GuidanceLogItem, type: "APPROVE" | "REVISION") {
    setSelectedLog(log);
    setActionType(type);
    setFeedback(log.supervisorFeedback || "");
    setIsOpen(true);
  }

  function handleOpenNotes(log: GuidanceLogItem) {
    setNotesDialog({ open: true, log });
    setNotesValue(log.lecturerNotes || "");
    setMilestoneId(log.milestoneId || "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLog) return;

    const token = getAccessToken();
    if (!token) return;

    if (actionType === "REVISION" && !feedback.trim()) {
      toast.error("Feedback wajib diisi jika meminta revisi");
      return;
    }

    setIsSubmitting(true);
    try {
      if (actionType === "APPROVE") {
        await approveGuidanceLog(token, selectedLog.id, feedback);
        toast.success("Logbook berhasil disetujui");
      } else {
        await requestRevisionGuidanceLog(token, selectedLog.id, feedback);
        toast.success("Permintaan revisi berhasil dikirim");
      }
      
      setIsOpen(false);
      await loadData();
    } catch (err) {
      toast.error("Gagal memproses logbook", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveNotes() {
    if (!notesDialog.log) return;
    const token = getAccessToken();
    if (!token) return;

    setIsSavingNotes(true);
    try {
      await updateGuidanceLogNotes(token, notesDialog.log.id, {
        lecturer_notes: notesValue,
        milestone_id: milestoneId || undefined,
      });
      toast.success("Catatan berhasil disimpan");
      setNotesDialog({ open: false, log: null });
      await loadData();
    } catch (err) {
      toast.error("Gagal menyimpan catatan", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleFileUpload(log: GuidanceLogItem, file: File) {
    const token = getAccessToken();
    if (!token) return;

    setIsUploading(true);
    try {
      const uploadRes = await uploadFile(token, file, "guidance_log");
      const fileId = uploadRes.data?.fileId;
      if (!fileId) {
        toast.error("Upload gagal: file ID tidak ditemukan");
        return;
      }

      await attachFileToGuidanceLog(token, log.id, {
        file_id: fileId,
        filename: file.name,
      });
      toast.success("File berhasil dilampirkan");
      await loadData();
    } catch (err) {
      toast.error("Gagal mengunggah file", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveAttachment(logId: string, fileId: string) {
    const token = getAccessToken();
    if (!token) return;

    try {
      await removeAttachmentFromGuidanceLog(token, logId, fileId);
      toast.success("Lampiran dihapus");
      await loadData();
    } catch (err) {
      toast.error("Gagal menghapus lampiran", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return <Badge variant="warning">Menunggu Review</Badge>;
      case "APPROVED":
        return <Badge variant="success">Disetujui</Badge>;
      case "REVISION_REQUIRED":
        return <Badge variant="danger">Revisi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric", month: "short", year: "numeric"
    }).format(new Date(dateStr));
  };

  return (
    <ProtectedPage
      title="Review Logbook Bimbingan"
      description="Evaluasi, beri catatan, dan lampirkan referensi pada logbook bimbingan mahasiswa."
      allowedRoles={["DOSEN"]}
    >
      <div className="space-y-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Tanggal</TableHead>
                <TableHead className="w-[180px]">Mahasiswa</TableHead>
                <TableHead>Topik & Catatan</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="text-right w-[200px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex justify-center"><Skeleton className="h-6 w-32" /></div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-text-muted">
                    Belum ada logbook bimbingan yang perlu direview.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className={log.status === "SUBMITTED" ? "bg-warning-soft/30" : ""}>
                    <TableCell className="align-top pt-4">
                      <span className="font-medium text-[13.5px]">
                        {formatDate(log.sessionDate)}
                      </span>
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      <span className="font-semibold text-text-primary text-[14px]">{log.studentName}</span>
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      <p className="font-medium text-text-primary text-[14px]">{log.topic}</p>
                      <p className="text-text-secondary text-[13px] mt-1">
                        {log.discussionSummary}
                      </p>
                      {log.nextAction && (
                        <p className="text-text-secondary text-[12px] mt-2 italic">
                          <span className="font-semibold not-italic">Next:</span> {log.nextAction}
                        </p>
                      )}

                      {log.milestoneName && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded bg-accent-primary/10 px-2 py-0.5 text-[11px] text-accent-primary">
                          <Tag className="size-3" />
                          {log.milestoneName}
                        </div>
                      )}

                      {log.lecturerNotes && (
                        <div className="mt-2 rounded border-l-2 border-accent-primary bg-bg-subtle p-2 text-[12px] text-text-secondary">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-0.5">Catatan Saya</p>
                          {log.lecturerNotes}
                        </div>
                      )}

                      {log.attachments && log.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {log.attachments.map((att) => (
                            <div key={att.fileId} className="flex items-center gap-2 rounded bg-bg-subtle px-2 py-1 text-[11px]">
                              <FileText className="size-3 text-text-muted" />
                              <span className="flex-1 truncate text-text-secondary">{att.filename}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(log.id, att.fileId)}
                                className="text-text-muted hover:text-status-error"
                                title="Hapus lampiran"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      {getStatusBadge(log.status)}
                    </TableCell>
                    <TableCell className="align-top pt-4 text-right">
                      <div className="flex flex-col gap-2">
                        {log.status === "SUBMITTED" && (
                          <>
                            <Button
                              variant="success"
                              size="sm"
                              className="w-full text-[12px] h-8"
                              onClick={() => handleOpenAction(log, "APPROVE")}
                            >
                              Setujui
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="w-full text-[12px] h-8"
                              onClick={() => handleOpenAction(log, "REVISION")}
                            >
                              Minta Revisi
                            </Button>
                          </>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-[12px] h-8"
                          onClick={() => handleOpenNotes(log)}
                        >
                          <MessageSquarePlus className="mr-1.5 size-3.5" />
                          Catatan & Tag
                        </Button>

                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(log, file);
                                e.target.value = "";
                              }
                            }}
                          />
                          <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-text-primary hover:bg-background-alt h-8">
                            <Paperclip className="size-3.5" />
                            Lampirkan File
                          </span>
                        </label>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Approve / Revision Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {actionType === "APPROVE" ? "Setujui Logbook" : "Minta Revisi Logbook"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Mahasiswa</Label>
                <p className="text-[14px] font-medium p-2 bg-background-alt rounded-md border border-border">
                  {selectedLog?.studentName}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Topik</Label>
                <p className="text-[13px] text-text-secondary p-2 bg-background-alt rounded-md border border-border">
                  {selectedLog?.topic}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">
                  Feedback Dosen {actionType === "REVISION" && <span className="text-danger">*</span>}
                </Label>
                <Textarea
                  id="feedback"
                  rows={4}
                  placeholder={
                    actionType === "APPROVE" 
                      ? "Tambahkan catatan jika perlu (opsional)" 
                      : "Jelaskan apa yang perlu direvisi..."
                  }
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  required={actionType === "REVISION"}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Batal</Button>
              </DialogClose>
              <Button 
                type="submit" 
                variant={actionType === "APPROVE" ? "success" : "danger"}
                loading={isSubmitting}
              >
                {actionType === "APPROVE" ? "Simpan & Setujui" : "Kirim Permintaan Revisi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lecturer Notes & Milestone Dialog */}
      <Dialog
        open={notesDialog.open}
        onOpenChange={(open) => {
          if (!open) setNotesDialog({ open: false, log: null });
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Catatan Dosen & Tag Milestone</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mahasiswa</Label>
              <p className="text-[14px] font-medium p-2 bg-background-alt rounded-md border border-border">
                {notesDialog.log?.studentName}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="milestone">Tag Milestone (opsional)</Label>
              <select
                id="milestone"
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-[14px]"
              >
                <option value="">— Tidak ada —</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </select>
              <p className="text-[12px] text-text-muted">
                Tandai milestone yang relevan dengan sesi bimbingan ini.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lecturer_notes">Catatan Dosen</Label>
              <Textarea
                id="lecturer_notes"
                rows={5}
                placeholder="Catatan atau referensi tambahan untuk sesi ini..."
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
              />
              <p className="text-[12px] text-text-muted">
                Catatan ini terlihat oleh mahasiswa.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotesDialog({ open: false, log: null })}
            >
              Batal
            </Button>
            <Button onClick={handleSaveNotes} loading={isSavingNotes}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}
