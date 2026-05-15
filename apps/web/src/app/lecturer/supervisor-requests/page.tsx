/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getAccessToken } from "@/lib/auth-storage";
import {
  SupervisorRequest,
  acceptSupervisorRequest,
  listLecturerSupervisorRequests,
  rejectSupervisorRequest,
} from "@/lib/supervisor-api";

export default function LecturerSupervisorRequestsPage() {
  const [requests, setRequests] = useState<SupervisorRequest[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadRequests() {
    const token = getAccessToken();
    if (!token) return;

    const response = await listLecturerSupervisorRequests(token);
    setRequests(response.data.requests);
  }

  useEffect(() => {
    loadRequests().catch((err) => {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    });
  }, []);

  async function handleAccept(requestId: string) {
    const token = getAccessToken();
    if (!token) return;

    setError("");
    setMessage("");

    try {
      await acceptSupervisorRequest(token, {
        request_id: requestId,
        note: "Dosen menerima penetapan sebagai pembimbing.",
      });

      setMessage("Pengajuan berhasil diterima.");
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menerima pengajuan");
    }
  }

  async function handleReject(requestId: string) {
    const token = getAccessToken();
    if (!token) return;

    setError("");
    setMessage("");

    try {
      await rejectSupervisorRequest(token, {
        request_id: requestId,
        note: "Dosen menolak penetapan sebagai pembimbing.",
      });

      setMessage("Pengajuan berhasil ditolak.");
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menolak pengajuan");
    }
  }

  return (
    <ProtectedPage
      title="Permintaan Dosen Pembimbing"
      description="Dosen dapat menerima atau menolak penetapan sebagai pembimbing."
      allowedRoles={["DOSEN"]}
    >
      {message ? (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">
          Daftar Penetapan Pembimbing
        </h2>

        <div className="mt-5 space-y-3">
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500">
              Belum ada penetapan dosen pembimbing.
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

                {request.status === "ASSIGNED" ? (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleAccept(request.id)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Terima
                    </button>

                    <button
                      onClick={() => handleReject(request.id)}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Tolak
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </ProtectedPage>
  );
}
