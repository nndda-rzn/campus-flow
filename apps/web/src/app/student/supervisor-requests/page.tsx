/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAccessToken } from "@/lib/auth-storage";
import {
  Lecturer,
  SupervisorRequest,
  createSupervisorRequest,
  listLecturers,
  listMySupervisorRequests,
} from "@/lib/supervisor-api";

export default function StudentSupervisorRequestsPage() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [requests, setRequests] = useState<SupervisorRequest[]>([]);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [lecturerId, setLecturerId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadData() {
    const token = getAccessToken();
    if (!token) return;

    const [lecturerResponse, requestResponse] = await Promise.all([
      listLecturers(token),
      listMySupervisorRequests(token),
    ]);

    const lecturerList = lecturerResponse.data.lecturers;
    setLecturers(lecturerList);
    setRequests(requestResponse.data.requests);

    if (lecturerList.length > 0 && !lecturerId) {
      setLecturerId(lecturerList[0].id);
    }
  }

  useEffect(() => {
    loadData().catch((err) => {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      setError("Token tidak ditemukan. Silakan login ulang.");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      await createSupervisorRequest(token, {
        topic_title: topicTitle,
        topic_description: topicDescription,
        lecturer_ids: [lecturerId],
      });

      setTopicTitle("");
      setTopicDescription("");
      setMessage("Pengajuan dosen pembimbing berhasil dibuat.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat pengajuan dosen pembimbing",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ProtectedPage
      title="Pengajuan Dosen Pembimbing"
      description="Ajukan topik tugas akhir dan pilih calon dosen pembimbing."
      allowedRoles={["MAHASISWA"]}
    >
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* ── Form ── */}
        <section className="card card-padded h-fit">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Buat Pengajuan
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Isi formulir untuk mengajukan dosen pembimbing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="form-label">Judul Topik</label>
              <input
                className="form-input"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="Contoh: Sistem Informasi Akademik Berbasis Microservices"
                required
              />
            </div>

            <div>
              <label className="form-label">Deskripsi Topik</label>
              <textarea
                className="form-textarea min-h-24"
                value={topicDescription}
                onChange={(e) => setTopicDescription(e.target.value)}
                placeholder="Jelaskan ringkasan topik tugas akhir..."
              />
            </div>

            <div>
              <label className="form-label">Calon Dosen Pembimbing</label>
              <select
                className="form-select"
                value={lecturerId}
                onChange={(e) => setLecturerId(e.target.value)}
                required
              >
                {lecturers.map((lecturer) => (
                  <option key={lecturer.id} value={lecturer.id}>
                    {lecturer.fullName}
                    {lecturer.nidn ? ` · ${lecturer.nidn}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {message ? (
              <div className="alert alert-success">{message}</div>
            ) : null}
            {error ? <div className="alert alert-danger">{error}</div> : null}

            <button
              type="submit"
              disabled={isLoading || lecturers.length === 0}
              className="btn btn-primary w-full"
            >
              {isLoading ? "Menyimpan..." : "Buat Pengajuan"}
            </button>
          </form>
        </section>

        {/* ── List ── */}
        <section className="card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Riwayat Pengajuan
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Total {requests.length} pengajuan
            </p>
          </div>

          <div className="divide-y divide-border">
            {requests.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-text-muted">
                  Belum ada pengajuan dosen pembimbing.
                </p>
              </div>
            ) : (
              requests.map((request) => (
                <article key={request.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-text-primary">
                        {request.topicTitle}
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        {request.requestNumber}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>

                  {request.topicDescription ? (
                    <p className="mt-3 text-sm leading-6 text-text-secondary">
                      {request.topicDescription}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                    {request.assignedLecturerName ? (
                      <span>
                        Pembimbing:{" "}
                        <span className="font-medium text-text-secondary">
                          {request.assignedLecturerName}
                        </span>
                      </span>
                    ) : (
                      <span>Belum ada pembimbing ditetapkan</span>
                    )}
                  </div>

                  {request.choices.length > 0 &&
                  !request.assignedLecturerName ? (
                    <div className="mt-2 text-xs text-text-muted">
                      Pilihan:{" "}
                      {request.choices.map((c) => c.lecturerName).join(", ")}
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </ProtectedPage>
  );
}
