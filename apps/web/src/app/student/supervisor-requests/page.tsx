"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useState } from "react";
import { GraduationCap, PlusCircle, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getAccessToken } from "@/lib/auth-storage";
import {
  Lecturer,
  SupervisorRequest,
  createSupervisorRequest,
  listLecturers,
  listMySupervisorRequests,
} from "@/lib/supervisor-api";

export default function StudentSupervisorRequestsPage() {
  return (
    <ProtectedPage
      title="Pengajuan Dosen Pembimbing"
      description="Ajukan topik tugas akhir dan pilih calon dosen pembimbing."
      allowedRoles={["MAHASISWA"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [requests, setRequests] = useState<SupervisorRequest[]>([]);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [lecturerId, setLecturerId] = useState("");
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  async function loadData() {
    const token = getAccessToken();
    if (!token) return;

    try {
      const [lecturerResponse, requestResponse] = await Promise.all([
        listLecturers(token),
        listMySupervisorRequests(token),
      ]);

      const lecs = lecturerResponse.data.lecturers;
      setLecturers(lecs);
      setRequests(requestResponse.data.requests);

      if (lecs[0] && !lecturerId) setLecturerId(lecs[0].id);
    } catch (err) {
      toast.error("Gagal memuat data", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsLoadingList(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    setIsCreating(true);
    try {
      await createSupervisorRequest(token, {
        topic_title: topicTitle,
        topic_description: topicDescription,
        lecturer_ids: [lecturerId],
      });

      toast.success("Pengajuan dibuat", {
        description:
          "Topik dan calon pembimbing menunggu verifikasi Admin Prodi.",
      });
      setTopicTitle("");
      setTopicDescription("");
      await loadData();
    } catch (err) {
      toast.error("Gagal membuat pengajuan", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      {/* ── Form ── */}
      <Card className="h-fit lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="size-4 text-primary" />
            Buat Pengajuan
          </CardTitle>
          <p className="text-[12.5px] text-text-muted">
            Pengajuan akan diverifikasi oleh Admin Prodi sebelum Kaprodi
            menetapkan dosen.
          </p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="topic-title">Judul Topik</Label>
              <Input
                id="topic-title"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="Sistem Informasi Akademik Berbasis Microservices"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="topic-description">
                Deskripsi Topik{" "}
                <span className="font-normal text-text-muted">(opsional)</span>
              </Label>
              <Textarea
                id="topic-description"
                value={topicDescription}
                onChange={(e) => setTopicDescription(e.target.value)}
                placeholder="Jelaskan ringkasan topik tugas akhir, scope, dan teknologi yang akan digunakan..."
                className="min-h-24"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lecturer-id">Calon Dosen Pembimbing</Label>
              <Select value={lecturerId} onValueChange={setLecturerId} required>
                <SelectTrigger id="lecturer-id">
                  <SelectValue placeholder="Pilih dosen..." />
                </SelectTrigger>
                <SelectContent>
                  {lecturers.map((lecturer) => (
                    <SelectItem key={lecturer.id} value={lecturer.id}>
                      <div className="flex flex-col">
                        <span>{lecturer.fullName}</span>
                        {lecturer.nidn ? (
                          <span className="font-mono text-[10.5px] text-text-muted">
                            NIDN {lecturer.nidn}
                          </span>
                        ) : null}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              loading={isCreating}
              size="lg"
              className="w-full"
              disabled={lecturers.length === 0}
            >
              {!isCreating && <Sparkles className="size-4" />}
              {isCreating ? "Mengirim..." : "Buat Pengajuan"}
            </Button>
          </CardContent>
        </form>
      </Card>

      {/* ── List ── */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4 text-text-muted" />
            Riwayat Pengajuan
          </CardTitle>
          <p className="mt-0.5 text-[12.5px] text-text-muted">
            {isLoadingList
              ? "Memuat..."
              : `${requests.length} pengajuan tercatat`}
          </p>
        </CardHeader>

        {isLoadingList ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="size-4" />}
            title="Belum ada pengajuan"
            description="Ajukan topik dan calon pembimbing dari formulir di sebelah kiri."
          />
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((request) => (
              <li key={request.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium leading-tight text-text-primary">
                      {request.topicTitle}
                    </p>
                    <p className="mt-1 font-mono text-[11.5px] text-text-muted">
                      {request.requestNumber}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>

                {request.topicDescription ? (
                  <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">
                    {request.topicDescription}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                  {request.assignedLecturerName ? (
                    <Badge variant="success" withDot={false}>
                      <GraduationCap className="size-3" />
                      Pembimbing: {request.assignedLecturerName}
                    </Badge>
                  ) : request.choices.length > 0 ? (
                    <span className="text-text-muted">
                      Pilihan:{" "}
                      <span className="text-text-secondary">
                        {request.choices.map((c) => c.lecturerName).join(", ")}
                      </span>
                    </span>
                  ) : (
                    <span className="text-text-muted">
                      Belum ada pembimbing ditetapkan
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
