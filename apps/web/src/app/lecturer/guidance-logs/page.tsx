"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { 
  getLecturerGuidanceLogs, 
  approveGuidanceLog,
  requestRevisionGuidanceLog,
  GuidanceLogItem 
} from "@/lib/guidance-api";
import { getAccessToken } from "@/lib/auth-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function LecturerGuidanceLogsPage() {
  const [logs, setLogs] = useState<GuidanceLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<GuidanceLogItem | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REVISION">("APPROVE");
  const [feedback, setFeedback] = useState("");

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

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenAction(log: GuidanceLogItem, type: "APPROVE" | "REVISION") {
    setSelectedLog(log);
    setActionType(type);
    setFeedback(log.supervisorFeedback || "");
    setIsOpen(true);
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
      description="Evaluasi dan berikan feedback pada logbook bimbingan mahasiswa."
      allowedRoles={["DOSEN"]}
    >
      <div className="space-y-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Tanggal</TableHead>
                <TableHead className="w-[200px]">Mahasiswa</TableHead>
                <TableHead>Topik & Ringkasan</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="text-right w-[180px]">Aksi</TableHead>
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
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      {getStatusBadge(log.status)}
                    </TableCell>
                    <TableCell className="align-top pt-4 text-right space-y-2">
                      {log.status === "SUBMITTED" && (
                        <div className="flex flex-col gap-2">
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
                        </div>
                      )}
                      
                      {(log.status === "APPROVED" || log.status === "REVISION_REQUIRED") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-[12px] h-8"
                          onClick={() => handleOpenAction(log, log.status === "APPROVED" ? "APPROVE" : "REVISION")}
                        >
                          Lihat Detail / Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

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
    </ProtectedPage>
  );
}
