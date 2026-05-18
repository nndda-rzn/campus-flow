"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { 
  getStudentThesisProgress, 
  updateThesisProgress,
  ThesisProgressItem,
  ThesisProgressStatus,
} from "@/lib/thesis-api";
import { getAccessToken } from "@/lib/auth-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlayCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

export default function ThesisProgressPage() {
  const [progress, setProgress] = useState<ThesisProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<ThesisProgressItem | null>(null);
  
  const [formData, setFormData] = useState({
    notes: "",
    target_date: "",
    status: "NOT_STARTED" as ThesisProgressStatus,
  });

  async function loadData(showRefresh = false) {
    const token = getAccessToken();
    if (!token) return;

    if (showRefresh) setIsRefreshing(true);

    try {
      const res = await getStudentThesisProgress(token);
      setProgress(res.data?.items || []);
    } catch (err) {
      toast.error("Gagal memuat data progress", {
        description: err instanceof Error ? err.message : "Silakan coba lagi nanti",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenForm(item: ThesisProgressItem) {
    setEditingItem(item);
    setFormData({
      notes: item.notes || "",
      target_date: item.targetDate || "",
      status: item.status,
    });
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;

    const token = getAccessToken();
    if (!token) return;

    setIsSubmitting(true);
    try {
      await updateThesisProgress(token, editingItem.id, {
        notes: formData.notes,
        target_date: formData.target_date || undefined,
        status: formData.status,
      });
      toast.success("Progress berhasil diperbarui");
      setIsOpen(false);
      await loadData();
    } catch (err) {
      toast.error("Gagal memperbarui progress", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStartProgress(item: ThesisProgressItem) {
    const token = getAccessToken();
    if (!token) return;

    try {
      await updateThesisProgress(token, item.id, {
        notes: item.notes || "",
        target_date: item.targetDate || undefined,
        status: "IN_PROGRESS",
      });
      toast.success(`Mulai mengerjakan: ${item.milestoneName}`);
      await loadData();
    } catch (err) {
      toast.error("Gagal memulai tahapan", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric", month: "short", year: "numeric"
    }).format(new Date(dateStr));
  };

  const completedCount = progress.filter(p => p.status === "COMPLETED").length;
  const percentage = progress.length > 0 ? Math.round((completedCount / progress.length) * 100) : 0;

  return (
    <ProtectedPage
      title="Progress Skripsi"
      description="Lacak tahapan penyelesaian skripsi Anda sesuai dengan milestone program studi."
      allowedRoles={["MAHASISWA"]}
    >
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : progress.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              title="Progress Belum Aktif"
              description="Progress skripsi akan aktif secara otomatis setelah pengajuan pembimbing Anda disetujui (Status COMPLETED)."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="bg-surface overflow-hidden">
            <div className="h-1.5 w-full bg-border">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-in-out" 
                style={{ width: `${percentage}%` }}
              />
            </div>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h3 className="text-[18px] font-semibold text-text-primary">
                    Penyelesaian: {percentage}%
                  </h3>
                  <p className="text-text-secondary mt-1 text-[14px]">
                    {completedCount} dari {progress.length} tahapan selesai
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadData(true)}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("mr-2 size-4", isRefreshing && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Milestone Skripsi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l-2 border-border ml-4 space-y-10 py-2">
                {progress.map((item) => {
                  const isCompleted = item.status === "COMPLETED";
                  const isInProgress = item.status === "IN_PROGRESS";
                  const isNotStarted = item.status === "NOT_STARTED";
                  
                  // Dot styles based on status
                  let dotClass = "bg-border ring-surface";
                  if (isCompleted) dotClass = "bg-success ring-success/20";
                  else if (isInProgress) dotClass = "bg-primary ring-primary/20";
                  
                  return (
                    <div key={item.id} className="relative pl-8">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[9px] top-1.5 flex h-4 w-4 rounded-full ring-4 ${dotClass}`}>
                        {isCompleted && (
                          <svg className="w-4 h-4 text-white p-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className={`text-[15px] font-semibold ${isCompleted ? 'text-text-primary' : 'text-text-primary'}`}>
                            {item.sequenceOrder}. {item.milestoneName}
                          </h4>
                          
                          <div className="mt-2 grid grid-cols-2 gap-y-2 text-[13px] text-text-secondary max-w-md">
                            <div>
                              <span className="text-text-muted block text-[11px] uppercase tracking-wider mb-0.5">Status</span>
                              {isCompleted ? (
                                <span className="font-medium text-success">Selesai</span>
                              ) : isInProgress ? (
                                <span className="font-medium text-primary">Sedang Dikerjakan</span>
                              ) : (
                                <span>Belum Mulai</span>
                              )}
                            </div>
                            
                            <div>
                              <span className="text-text-muted block text-[11px] uppercase tracking-wider mb-0.5">Target Selesai</span>
                              <span className={!item.targetDate ? "text-text-disabled" : ""}>
                                {formatDate(item.targetDate)}
                              </span>
                            </div>
                            
                            {isCompleted && item.completedAt && (
                              <div className="col-span-2 mt-1">
                                <span className="text-text-muted block text-[11px] uppercase tracking-wider mb-0.5">Selesai Pada</span>
                                {new Date(item.completedAt).toLocaleString('id-ID')}
                              </div>
                            )}
                          </div>
                          
                          {item.notes && (
                            <div className="mt-4 bg-background-alt p-3 rounded-md border border-border text-[13px] text-text-primary">
                              <span className="text-text-muted block text-[11px] font-semibold uppercase tracking-wider mb-1">Catatan Progress:</span>
                              {item.notes}
                            </div>
                          )}
                        </div>
                        
                        {!isCompleted && (
                          <div className="flex flex-col gap-2 shrink-0">
                            {isNotStarted && (
                              <Button 
                                variant="primary" 
                                size="sm" 
                                className="text-[12px] h-8"
                                onClick={() => handleStartProgress(item)}
                              >
                                <PlayCircle className="mr-1.5 size-3.5" />
                                Mulai Kerjakan
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-[12px] h-8"
                              onClick={() => handleOpenForm(item)}
                            >
                              {isNotStarted ? "Set Target" : "Update Progress"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Update Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tahapan</Label>
                <p className="text-[14px] font-medium p-2 bg-background-alt rounded-md border border-border">
                  {editingItem?.milestoneName}
                </p>
              </div>

              {editingItem?.status !== "COMPLETED" && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ThesisProgressStatus })}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-[14px]"
                  >
                    <option value="NOT_STARTED">Belum Mulai</option>
                    <option value="IN_PROGRESS">Sedang Dikerjakan</option>
                  </select>
                  <p className="text-[12px] text-text-muted">
                    Status &quot;Selesai&quot; hanya dapat ditandai oleh dosen pembimbing.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="target_date">Target Selesai (opsional)</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                />
                <p className="text-[12px] text-text-muted">
                  Bantu pembimbing mengetahui estimasi kapan Anda akan menyelesaikan tahapan ini.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan Progress (opsional)</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder="Misal: Sedang proses pengumpulan data kuesioner..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Batal</Button>
              </DialogClose>
              <Button type="submit" loading={isSubmitting}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}
