/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
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
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Buat Pengajuan Pembimbing
          </h2>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Judul Topik
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                value={topicTitle}
                onChange={(event) => setTopicTitle(event.target.value)}
                placeholder="Contoh: Sistem Informasi Akademik Berbasis Microservices"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Deskripsi Topik
              </label>
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                value={topicDescription}
                onChange={(event) => setTopicDescription(event.target.value)}
                placeholder="Jelaskan ringkasan topik tugas akhir..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Calon Dosen Pembimbing
              </label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                value={lecturerId}
                onChange={(event) => setLecturerId(event.target.value)}
                required
              >
                {lecturers.map((lecturer) => (
                  <option key={lecturer.id} value={lecturer.id}>
                    {lecturer.fullName}{" "}
                    {lecturer.nidn ? `· ${lecturer.nidn}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {message ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading || lecturers.length === 0}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {isLoading ? "Menyimpan..." : "Buat Pengajuan"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Riwayat Pengajuan Pembimbing
          </h2>

          <div className="mt-5 space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-slate-500">
                Belum ada pengajuan dosen pembimbing.
              </p>
            ) : (
              requests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-slate-900">
                        {request.topicTitle}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {request.requestNumber}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {request.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {request.topicDescription || "-"}
                  </p>

                  <div className="mt-3 text-xs text-slate-500">
                    {request.assignedLecturerName ? (
                      <p>Pembimbing: {request.assignedLecturerName}</p>
                    ) : (
                      <p>Belum ada dosen pembimbing yang ditetapkan.</p>
                    )}
                  </div>

                  {request.choices.length > 0 ? (
                    <div className="mt-3 text-xs text-slate-500">
                      Pilihan:{" "}
                      {request.choices
                        .map((choice) => choice.lecturerName)
                        .join(", ")}
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
