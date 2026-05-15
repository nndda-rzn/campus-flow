/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { StatusBadge } from "@/components/ui/status-badge";
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
  const [actingId, setActingId] = useState<string | null>(null);

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
    setActingId(requestId);
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
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(requestId: string) {
    const token = getAccessToken();
    if (!token) return;
    setActingId(requestId);
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
    } finally {
      setActingId(null);
    }
  }

  return (
    <ProtectedPage
      title="Permintaan Pembimbing"
      description="Terima atau tolak penetapan sebagai dosen pembimbing dari Kaprodi."
      allowedRoles={["DOSEN"]}
    >
      <div className="space-y-4">
        {message ? <div className="alert alert-success">{message}</div> : null}
        {error ? <div className="alert alert-danger">{error}</div> : null}

        <section className="card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Daftar Penetapan
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Total {requests.length} penetapan
            </p>
          </div>

          <div className="divide-y divide-border">
            {requests.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-text-muted">
                  Belum ada penetapan dosen pembimbing.
                </p>
              </div>
            ) : (
              requests.map((request) => {
                const isActing = actingId === request.id;
                return (
                  <article key={request.id} className="px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
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

                    {request.status === "ASSIGNED" ? (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleAccept(request.id)}
                          disabled={isActing}
                          className="btn btn-success"
                        >
                          {isActing ? "Memproses..." : "Terima"}
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={isActing}
                          className="btn btn-secondary"
                        >
                          Tolak
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </ProtectedPage>
  );
}
