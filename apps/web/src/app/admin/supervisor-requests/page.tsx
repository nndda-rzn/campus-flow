"use client";

import { FormEvent, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getAccessToken } from "@/lib/auth-storage";
import { verifySupervisorRequest } from "@/lib/supervisor-api";

export default function AdminSupervisorRequestsPage() {
  const [requestId, setRequestId] = useState("");
  const [note, setNote] = useState(
    "Topik dan pilihan dosen sudah diverifikasi.",
  );
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    setResult("");
    setError("");

    try {
      const response = await verifySupervisorRequest(token, {
        request_id: requestId,
        note,
      });
      setResult(
        `Berhasil verifikasi. Status sekarang: ${response.data.request.status}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal verifikasi");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ProtectedPage
      title="Verifikasi Pengajuan Pembimbing"
      description="Verifikasi pengajuan dosen pembimbing sebelum Kaprodi menetapkan dosen."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI"]}
    >
      <section className="card card-padded max-w-2xl">
        <div className="border-b border-border pb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Form Verifikasi
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Masukkan ID pengajuan dan catatan untuk memverifikasi.
          </p>
        </div>

        <form onSubmit={handleVerify} className="mt-5 space-y-4">
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
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? "Memproses..." : "Verifikasi Pengajuan"}
          </button>
        </form>
      </section>
    </ProtectedPage>
  );
}
