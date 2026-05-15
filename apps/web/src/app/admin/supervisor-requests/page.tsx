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
      description="Admin Prodi memverifikasi pengajuan dosen pembimbing sebelum Kaprodi menetapkan dosen."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI"]}
    >
      <section className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleVerify} className="space-y-4">
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
            disabled={isLoading}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isLoading ? "Memproses..." : "Verifikasi Pengajuan"}
          </button>
        </form>
      </section>
    </ProtectedPage>
  );
}
