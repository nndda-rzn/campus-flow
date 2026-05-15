/* eslint-disable react-hooks/set-state-in-effect */
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
      description="Tetapkan dosen pembimbing untuk pengajuan yang sudah diverifikasi."
      allowedRoles={["KAPRODI"]}
    >
      <section className="card card-padded max-w-2xl">
        <div className="border-b border-border pb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Form Penetapan
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Pilih dosen yang akan ditetapkan sebagai pembimbing.
          </p>
        </div>

        <form onSubmit={handleAssign} className="mt-5 space-y-4">
          <div>
            <label className="form-label">Request ID</label>
            <input
              className="form-input font-mono text-xs"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              placeholder="UUID supervisor request"
              required
            />
          </div>

          <div>
            <label className="form-label">Dosen Pembimbing</label>
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

          <div>
            <label className="form-label">Catatan</label>
            <textarea
              className="form-textarea min-h-24"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {result ? <div className="alert alert-success">{result}</div> : null}
          {error ? <div className="alert alert-danger">{error}</div> : null}

          <button
            type="submit"
            disabled={isLoading || lecturers.length === 0}
            className="btn btn-primary"
          >
            {isLoading ? "Memproses..." : "Tetapkan Dosen"}
          </button>
        </form>
      </section>
    </ProtectedPage>
  );
}
