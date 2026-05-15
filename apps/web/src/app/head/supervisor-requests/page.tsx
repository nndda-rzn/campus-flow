"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getAccessToken } from "@/lib/auth-storage";
import {
  Lecturer,
  assignSupervisor,
  listLecturers,
} from "@/lib/supervisor-api";

export default function HeadSupervisorRequestsPage() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [requestId, setRequestId] = useState("");
  const [lecturerId, setLecturerId] = useState("");
  const [note, setNote] = useState("Dosen pembimbing ditetapkan oleh Kaprodi.");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadLecturers() {
      const token = getAccessToken();
      if (!token) return;

      const response = await listLecturers(token);
      setLecturers(response.data.lecturers);

      if (response.data.lecturers.length > 0) {
        setLecturerId(response.data.lecturers[0].id);
      }
    }

    loadLecturers().catch((err) => {
      setError(err instanceof Error ? err.message : "Gagal memuat dosen");
    });
  }, []);

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    setResult("");
    setError("");

    try {
      const response = await assignSupervisor(token, {
        request_id: requestId,
        lecturer_id: lecturerId,
        note,
      });

      setResult(
        `Berhasil assign. Status sekarang: ${response.data.request.status}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menetapkan dosen");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ProtectedPage
      title="Penetapan Dosen Pembimbing"
      description="Kaprodi menetapkan dosen pembimbing untuk pengajuan yang sudah diverifikasi."
      allowedRoles={["KAPRODI"]}
    >
      <section className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Request ID
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              value={requestId}
              onChange={(event) => setRequestId(event.target.value)}
              placeholder="UUID supervisor request"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Dosen Pembimbing
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

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Catatan
            </label>
            <textarea
              className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          {result ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {result}
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
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isLoading ? "Memproses..." : "Tetapkan Dosen"}
          </button>
        </form>
      </section>
    </ProtectedPage>
  );
}
