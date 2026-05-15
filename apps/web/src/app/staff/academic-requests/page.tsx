/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { FileSection } from "@/components/academic/file-section";
import { getAccessToken } from "@/lib/auth-storage";
import {
  AcademicRequest,
  completeAcademicRequest,
  listAllAcademicRequests,
} from "@/lib/academic-api";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "SUBMITTED", label: "Diajukan" },
  { value: "VERIFIED", label: "Diverifikasi" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "REJECTED", label: "Ditolak" },
];

export default function StaffAcademicRequestsPage() {
  const [requests, setRequests] = useState<AcademicRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("APPROVED");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function loadRequests(filter: string) {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    setError("");
    try {
      const res = await listAllAcademicRequests(token, filter || undefined);
      setRequests(res.data?.requests ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat daftar pengajuan",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRequests(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleComplete(request: AcademicRequest) {
    const token = getAccessToken();
    if (!token) return;

    setCompletingId(request.id);
    setError("");
    setSuccessMsg("");

    try {
      await completeAcademicRequest(token, {
        request_id: request.id,
        note: noteMap[request.id] ?? "",
      });
      setSuccessMsg(
        `Pengajuan ${request.requestNumber} berhasil diselesaikan.`,
      );
      setExpandedId(null);
      await loadRequests(statusFilter);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyelesaikan pengajuan",
      );
    } finally {
      setCompletingId(null);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <ProtectedPage
      title="Pengajuan Akademik — Tata Usaha"
      description="Upload dokumen final dan selesaikan pengajuan yang sudah disetujui."
      allowedRoles={["TATA_USAHA", "SUPER_ADMIN"]}
    >
      <div className="space-y-6">
        {/* Filter status */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Filter:</span>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Pesan */}
        {successMsg ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMsg}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Daftar pengajuan */}
        {isLoading ? (
          <p className="text-sm text-slate-500">Memuat pengajuan...</p>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">
              Tidak ada pengajuan dengan status ini.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const token = getAccessToken() ?? "";
              const isExpanded = expandedId === request.id;
              const isCompleting = completingId === request.id;

              return (
                <article
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* Header */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(request.id)}
                    className="flex w-full items-start justify-between gap-4 p-5 text-left"
                  >
                    <div>
                      <h3 className="font-medium text-slate-900">
                        {request.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {request.requestNumber} · {request.serviceName}
                      </p>
                      {request.description ? (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                          {request.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={request.status} />
                      <span className="text-xs text-slate-400">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-5">
                      {/* File section */}
                      <div>
                        <h4 className="mb-3 text-sm font-semibold text-slate-700">
                          Dokumen
                        </h4>
                        <FileSection
                          token={token}
                          requestId={request.id}
                          canUploadFinal={request.status === "APPROVED"}
                        />
                      </div>

                      {/* Tombol complete — hanya untuk status APPROVED */}
                      {request.status === "APPROVED" && (
                        <div className="space-y-3 border-t border-slate-100 pt-4">
                          <h4 className="text-sm font-semibold text-slate-700">
                            Selesaikan Pengajuan
                          </h4>
                          <textarea
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                            rows={2}
                            placeholder="Catatan (opsional)..."
                            value={noteMap[request.id] ?? ""}
                            onChange={(e) =>
                              setNoteMap((prev) => ({
                                ...prev,
                                [request.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            disabled={isCompleting}
                            onClick={() => handleComplete(request)}
                            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                          >
                            {isCompleting ? "Memproses..." : "Tandai Selesai"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    SUBMITTED: "bg-blue-100 text-blue-700",
    VERIFIED: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    COMPLETED: "bg-slate-100 text-slate-700",
    CANCELLED: "bg-slate-100 text-slate-500",
    REVISION_REQUIRED: "bg-orange-100 text-orange-700",
  };

  const labelMap: Record<string, string> = {
    SUBMITTED: "Diajukan",
    VERIFIED: "Diverifikasi",
    APPROVED: "Disetujui",
    REJECTED: "Ditolak",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
    REVISION_REQUIRED: "Perlu Revisi",
  };

  const color = colorMap[status] ?? "bg-slate-100 text-slate-700";
  const label = labelMap[status] ?? status;

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
