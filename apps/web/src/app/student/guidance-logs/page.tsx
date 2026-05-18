"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { 
  getStudentGuidanceLogs, 
  createGuidanceLog, 
  updateGuidanceLog, 
  submitGuidanceLog, 
  deleteGuidanceLog,
  GuidanceLogItem 
} from "@/lib/guidance-api";
import { listMySupervisorRequests } from "@/lib/supervisor-api";
import { getAccessToken } from "@/lib/auth-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function GuidanceLogsPage() {
  const [logs, setLogs] = useState<GuidanceLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  
  // Form state
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLog, setEditingLog] = useState<GuidanceLogItem | null>(null);
  
  const [formData, setFormData] = useState({
    session_date: new Date().toISOString().split('T')[0],
    start_time: "",
    end_time: "",
    topic: "",
    discussion_summary: "",
    next_action: "",
  });

  async function loadData() {
    const token = getAccessToken();
    if (!token) return;

    try {
      // Find active supervisor assignment first
      const reqsRes = await listMySupervisorRequests(token);
      const reqs = reqsRes.data?.requests || [];
      // Request is COMPLETED when lecturer accepts
      const active = reqs.find(r => r.status === "COMPLETED" && r.assignedLecturerId);
      
      setActiveRequest(active || null);

      if (active) {
        const logsRes = await getStudentGuidanceLogs(token);
        setLogs(logsRes.data?.items || []);
      }
    } catch (err) {
      toast.error("Gagal memuat data", {
        description: err instanceof Error ? err.message : "Silakan coba lagi nanti",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenForm(log?: GuidanceLogItem) {
    if (log) {
      setEditingLog(log);
      setFormData({
        session_date: log.sessionDate,
        start_time: log.startTime || "",
        end_time: log.endTime || "",
        topic: log.topic,
        discussion_summary: log.discussionSummary,
        next_action: log.nextAction || "",
      });
    } else {
      setEditingLog(null);
      setFormData({
        session_date: new Date().toISOString().split('T')[0],
        start_time: "",
        end_time: "",
        topic: "",
        discussion_summary: "",
        next_action: "",
      });
    }
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!activeRequest) {
      toast.error("Anda belum memiliki dosen pembimbing");
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    setIsSubmitting(true);
    try {
      if (editingLog) {
        await updateGuidanceLog(token, editingLog.id, formData);
        toast.success("Logbook berhasil diperbarui");
      } else {
        await createGuidanceLog(token, {
          supervisor_request_id: activeRequest.id,
          lecturer_user_id: activeRequest.assignedLecturerId, // Using the lecturer's user ID is expected by the API
          ...formData
        });
        toast.success("Logbook berhasil ditambahkan");
      }
      setIsOpen(false);
      await loadData();
    } catch (err) {
      toast.error(editingLog ? "Gagal memperbarui logbook" : "Gagal menambahkan logbook", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitToLecturer(id: string) {
    if (!confirm("Kirim logbook ini ke dosen pembimbing? Anda tidak dapat mengubahnya lagi sampai ada feedback.")) return;
    
    const token = getAccessToken();
    if (!token) return;

    try {
      await submitGuidanceLog(token, id);
      toast.success("Logbook berhasil dikirim ke dosen");
      await loadData();
    } catch (err) {
      toast.error("Gagal mengirim logbook", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus logbook ini?")) return;
    
    const token = getAccessToken();
    if (!token) return;

    try {
      await deleteGuidanceLog(token, id);
      toast.success("Logbook berhasil dihapus");
      await loadData();
    } catch (err) {
      toast.error("Gagal menghapus logbook", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline">Draft</Badge>;
      case "SUBMITTED":
        return <Badge variant="warning">Menunggu Dosen</Badge>;
      case "APPROVED":
        return <Badge variant="success">Disetujui</Badge>;
      case "REVISION_REQUIRED":
        return <Badge variant="danger">Perlu Revisi</Badge>;
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
      title="Logbook Bimbingan"
      description="Catat setiap sesi bimbingan dengan dosen pembimbing Anda."
      allowedRoles={["MAHASISWA"]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !activeRequest ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                title="Belum Ada Pembimbing"
                description="Anda belum memiliki dosen pembimbing yang disetujui. Ajukan pembimbing terlebih dahulu di menu Dosen Pembimbing."
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] text-text-secondary uppercase tracking-wider font-semibold mb-1">
                    Dosen Pembimbing Aktif
                  </p>
                  <p className="text-[16px] font-semibold text-text-primary">
                    {activeRequest.assignedLecturerName}
                  </p>
                  <p className="text-[14px] text-text-secondary mt-1">
                    {activeRequest.topicTitle}
                  </p>
                </div>
                
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenForm()}>+ Tambah Sesi</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingLog ? "Edit Sesi Bimbingan" : "Catat Sesi Bimbingan"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                      <DialogBody className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="session_date">Tanggal Bimbingan *</Label>
                          <Input
                            id="session_date"
                            type="date"
                            required
                            value={formData.session_date}
                            onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="start_time">Mulai (opsional)</Label>
                            <Input
                              id="start_time"
                              type="time"
                              value={formData.start_time}
                              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="end_time">Selesai (opsional)</Label>
                            <Input
                              id="end_time"
                              type="time"
                              value={formData.end_time}
                              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="topic">Topik Pembahasan *</Label>
                          <Input
                            id="topic"
                            required
                            placeholder="Misal: Revisi BAB I"
                            value={formData.topic}
                            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="discussion_summary">Ringkasan Diskusi *</Label>
                          <Textarea
                            id="discussion_summary"
                            required
                            rows={3}
                            placeholder="Apa saja yang dibahas dalam sesi ini?"
                            value={formData.discussion_summary}
                            onChange={(e) => setFormData({ ...formData, discussion_summary: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="next_action">Rencana Tindak Lanjut</Label>
                          <Textarea
                            id="next_action"
                            rows={2}
                            placeholder="Apa yang harus dikerjakan selanjutnya?"
                            value={formData.next_action}
                            onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
                          />
                        </div>
                      </DialogBody>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline" type="button">Batal</Button>
                        </DialogClose>
                        <Button type="submit" loading={isSubmitting}>
                          Simpan Draft
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Tanggal</TableHead>
                    <TableHead>Topik & Ringkasan</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="text-right w-[150px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-text-muted">
                        Belum ada sesi bimbingan yang dicatat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="align-top pt-4">
                          <span className="font-medium text-[13.5px]">
                            {formatDate(log.sessionDate)}
                          </span>
                          {(log.startTime || log.endTime) && (
                            <div className="text-[12px] text-text-muted mt-1">
                              {log.startTime?.slice(0, 5) || "..."} - {log.endTime?.slice(0, 5) || "..."}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <p className="font-medium text-text-primary text-[14px]">{log.topic}</p>
                          <p className="text-text-secondary text-[13px] mt-1 line-clamp-2">
                            {log.discussionSummary}
                          </p>
                          
                          {log.supervisorFeedback && (
                            <div className="mt-3 bg-accent-soft p-2 rounded border border-accent/20">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-1">
                                Feedback Dosen:
                              </p>
                              <p className="text-[13px] text-text-primary">{log.supervisorFeedback}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          {getStatusBadge(log.status)}
                        </TableCell>
                        <TableCell className="align-top pt-4 text-right space-y-2">
                          {(log.status === "DRAFT" || log.status === "REVISION_REQUIRED") && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-[12px] h-8"
                                onClick={() => handleOpenForm(log)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                className="w-full text-[12px] h-8"
                                onClick={() => handleSubmitToLecturer(log.id)}
                              >
                                Kirim ke Dosen
                              </Button>
                            </>
                          )}
                          
                          {log.status === "DRAFT" && (
                            <Button
                              variant="danger"
                              size="sm"
                              className="w-full text-[12px] h-8"
                              onClick={() => handleDelete(log.id)}
                            >
                              Hapus
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </ProtectedPage>
  );
}
