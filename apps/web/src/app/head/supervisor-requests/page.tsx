"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  GraduationCap,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAccessToken } from "@/lib/auth-storage";
import {
  Lecturer,
  SupervisorRequest,
  assignSupervisor,
  listAllSupervisorRequests,
  listLecturers,
} from "@/lib/supervisor-api";
import { cn } from "@/lib/cn";

const STATUS_OPTIONS = [
  { value: "VERIFIED", label: "Menunggu Penetapan" },
  { value: "ASSIGNED", label: "Ditetapkan" },
  { value: "ACCEPTED", label: "Diterima" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "", label: "Semua" },
];

export default function HeadSupervisorRequestsPage() {
  return (
    <ProtectedPage
      title="Penetapan Dosen Pembimbing"
      description="Tetapkan dosen pembimbing untuk pengajuan yang sudah diverifikasi Admin Prodi."
      allowedRoles={["KAPRODI", "SUPER_ADMIN"]}
    >
      <Suspense fallback={null}>
        <PageContent />
      </Suspense>
    </ProtectedPage>
  );
}

function PageContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "VERIFIED";

  const [requests, setRequests] = useState<SupervisorRequest[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [assignTarget, setAssignTarget] = useState<SupervisorRequest | null>(
    null,
  );
  const [selectedLecturerId, setSelectedLecturerId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  async function loadData(filter: string) {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    setError("");
    try {
      const [reqRes, lecRes] = await Promise.all([
        listAllSupervisorRequests(token, filter || undefined),
        listLecturers(token),
      ]);
      setRequests(reqRes.data?.requests ?? []);
      setLecturers(lecRes.data?.lecturers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        r.topicTitle.toLowerCase().includes(q) ||
        r.requestNumber.toLowerCase().includes(q),
    );
  }, [requests, searchQuery]);

  const { currentPage, paginatedItems, setPage, goToFirst } = usePagination(
    filteredRequests,
    10,
  );

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    goToFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchQuery]);

  function openAssignDialog(request: SupervisorRequest) {
    setAssignTarget(request);
    // Pre-select first choice if available
    const firstChoice = request.choices[0];
    const matchedLecturer = firstChoice
      ? lecturers.find((l) => l.id === firstChoice.lecturerId)
      : null;
    setSelectedLecturerId(matchedLecturer?.id ?? lecturers[0]?.id ?? "");
    setAssignNote("Dosen pembimbing ditetapkan oleh Kaprodi.");
  }

  function closeAssignDialog() {
    setAssignTarget(null);
    setSelectedLecturerId("");
    setAssignNote("");
  }

  async function handleAssign() {
    if (!assignTarget || !selectedLecturerId) return;
    const token = getAccessToken();
    if (!token) return;

    setIsAssigning(true);
    try {
      await assignSupervisor(token, {
        request_id: assignTarget.id,
        lecturer_id: selectedLecturerId,
        note: assignNote.trim() || "Dosen pembimbing ditetapkan oleh Kaprodi.",
      });

      const selected = lecturers.find((l) => l.id === selectedLecturerId);
      toast.success("Dosen ditetapkan", {
        description: `${selected?.fullName ?? "Dosen"} ditetapkan untuk ${assignTarget.requestNumber}.`,
      });
      closeAssignDialog();
      await loadData(statusFilter);
    } catch (err) {
      toast.error("Gagal menetapkan dosen", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsAssigning(false);
    }
  }

  const verifiedCount = requests.filter((r) => r.status === "VERIFIED").length;
  const selectedLecturer = lecturers.find((l) => l.id === selectedLecturerId);

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="overflow-x-auto">
              {STATUS_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                  {opt.value === "VERIFIED" && verifiedCount > 0 ? (
                    <span className="ml-1 rounded-full bg-warning-soft px-1.5 py-0 text-[10.5px] font-semibold tabular-nums leading-tight text-warning-text">
                      {verifiedCount}
                    </span>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor atau topik..."
                className="h-9 w-full pl-8 sm:w-64"
              />
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => loadData(statusFilter)}
              aria-label="Refresh"
            >
              <RefreshCw
                className={cn("size-4", isLoading && "animate-spin")}
              />
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          {error ? (
            <EmptyState
              icon={<GraduationCap className="size-4" />}
              title="Tidak dapat memuat pengajuan"
              description={error}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadData(statusFilter)}
                >
                  Coba lagi
                </Button>
              }
            />
          ) : isLoading ? (
            <TableSkeleton />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-4" />}
              title={searchQuery ? "Tidak ada hasil" : "Tidak ada pengajuan"}
              description={
                searchQuery
                  ? `Tidak ditemukan pengajuan yang cocok dengan "${searchQuery}".`
                  : "Belum ada pengajuan pembimbing dengan status ini."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Topik</TableHead>
                  <TableHead>Pilihan Mahasiswa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="max-w-xs">
                      <p className="line-clamp-1 text-[13.5px] font-medium text-text-primary">
                        {request.topicTitle}
                      </p>
                      <p className="mt-0.5 font-mono text-[11.5px] text-text-muted">
                        {request.requestNumber}
                      </p>
                    </TableCell>
                    <TableCell>
                      {request.choices.length > 0 ? (
                        <div className="space-y-0.5">
                          {request.choices.slice(0, 2).map((c) => (
                            <p
                              key={c.lecturerId}
                              className="text-[12.5px] text-text-secondary"
                            >
                              <span className="mr-1 font-mono text-[10.5px] text-text-disabled">
                                {c.priority}.
                              </span>
                              {c.lecturerName}
                            </p>
                          ))}
                          {request.choices.length > 2 ? (
                            <p className="text-[11.5px] text-text-muted">
                              +{request.choices.length - 2} lainnya
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[12.5px] text-text-disabled">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-text-muted">
                        <Clock className="size-3" />
                        {formatRelativeDate(request.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === "VERIFIED" ? (
                        <Button
                          size="sm"
                          onClick={() => openAssignDialog(request)}
                          disabled={lecturers.length === 0}
                        >
                          <Users className="size-3.5" />
                          Tetapkan
                        </Button>
                      ) : (
                        <span className="text-[12.5px] text-text-disabled">
                          —
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {!isLoading && !error && filteredRequests.length > 0 ? (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredRequests.length}
            pageSize={10}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      {/* Assign Dialog */}
      <Dialog
        open={assignTarget !== null}
        onOpenChange={(open) => !open && closeAssignDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="size-4 text-primary" />
              Tetapkan Dosen Pembimbing
            </DialogTitle>
            <DialogDescription>
              Pilih dosen yang akan ditetapkan. Dosen akan menerima notifikasi
              untuk menerima atau menolak penetapan ini.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {assignTarget ? (
              <div className="rounded-md border border-border bg-background-alt p-3 space-y-2">
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                    Pengajuan
                  </p>
                  <p className="mt-0.5 font-mono text-[12px] text-text-muted">
                    {assignTarget.requestNumber}
                  </p>
                  <p className="mt-0.5 text-[14px] font-medium text-text-primary">
                    {assignTarget.topicTitle}
                  </p>
                </div>
                {assignTarget.choices.length > 0 ? (
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                      Rekomendasi Mahasiswa
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {assignTarget.choices.map((c) => (
                        <li
                          key={c.lecturerId}
                          className="text-[12.5px] text-text-secondary"
                        >
                          <span className="font-mono text-text-disabled">
                            {c.priority}.
                          </span>{" "}
                          {c.lecturerName}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="assign-lecturer">
                Dosen Pembimbing <span className="text-danger">*</span>
              </Label>
              <Select
                value={selectedLecturerId}
                onValueChange={setSelectedLecturerId}
              >
                <SelectTrigger id="assign-lecturer">
                  <SelectValue placeholder="Pilih dosen..." />
                </SelectTrigger>
                <SelectContent>
                  {lecturers.map((lecturer) => {
                    const isRecommended = assignTarget?.choices.some(
                      (c) => c.lecturerId === lecturer.id,
                    );
                    return (
                      <SelectItem key={lecturer.id} value={lecturer.id}>
                        <div className="flex flex-col">
                          <span>
                            {lecturer.fullName}
                            {isRecommended ? (
                              <span className="ml-1.5 text-[10.5px] font-medium text-primary">
                                (pilihan mahasiswa)
                              </span>
                            ) : null}
                          </span>
                          <span className="font-mono text-[10.5px] text-text-muted">
                            {lecturer.nidn
                              ? `NIDN ${lecturer.nidn}`
                              : "Tanpa NIDN"}{" "}
                            · Kuota {lecturer.maxSupervisorQuota}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedLecturer ? (
                <p className="text-[11.5px] text-text-muted">
                  Sisa kuota:{" "}
                  <span className="font-medium text-text-secondary">
                    {selectedLecturer.maxSupervisorQuota}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-note">
                Catatan{" "}
                <span className="font-normal text-text-muted">
                  (akan dikirim ke dosen)
                </span>
              </Label>
              <Textarea
                id="assign-note"
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                className="min-h-20"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={isAssigning}>
                Batal
              </Button>
            </DialogClose>
            <Button
              onClick={handleAssign}
              loading={isAssigning}
              disabled={!selectedLecturerId}
            >
              <CheckCircle2 className="size-3.5" />
              Tetapkan Dosen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div>
      <div className="border-b border-border bg-background-alt px-4 py-2">
        <Skeleton className="h-3 w-24" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
        >
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function formatRelativeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  const isoLike = dateStr.replace(" ", "T");
  const date = new Date(isoLike);
  if (isNaN(date.getTime())) return dateStr;

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes}m lalu`;
  if (hours < 24) return `${hours}j lalu`;
  if (days < 7) return `${days}h lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
