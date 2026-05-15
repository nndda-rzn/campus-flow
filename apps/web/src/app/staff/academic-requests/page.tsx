/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { FileSection } from "@/components/academic/file-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAccessToken } from "@/lib/auth-storage";
import {
  AcademicRequest,
  completeAcademicRequest,
  listAllAcademicRequests,
} from "@/lib/academic-api";

const STATUS_OPTIONS = [
  { value: "", label: "Semua" },
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

  // Counts per status untuk header summary
  const statusCounts = STATUS_OPTIONS.reduce<Record<string, number>>(
    (acc, opt) => {
      if (opt.value === "") {
        acc[opt.value] = requests.length;
      } else {
        acc[opt.value] = requests.filter((r) => r.status === opt.value).length;
      }
      return acc;
    },
    {},
  );

  return (
    <ProtectedPage
      title="Pengajuan Akademik"
      description="Upload dokumen final dan selesaikan pengajuan yang sudah disetujui."
      allowedRoles={["TATA_USAHA", "SUPER_ADMIN"]}
    >
      <div className="space-y-5">
        {/* Filter tabs */}
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-1 px-2 py-2">
            {STATUS_OPTIONS.map((opt) => {
              const isActive = statusFilter === opt.value;
              return (
                <button
                  key={opt.value || "all"}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-text-inverse"
                      : "text-text-secondary hover:bg-background-alt"
                  }`}
                >
                  {opt.label}
                  {opt.value === statusFilter && (
                    <span className="rounded-full bg-primary-hover px-1.5 py-0.5 text-xs">
                      {statusCounts[opt.value] ?? 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        {successMsg ? (
          <div className="alert alert-success">{successMsg}</div>
        ) : null}
        {error ? <div className="alert alert-danger">{error}</div> : null}

        {/* List */}
        {isLoading ? (
          <div className="card card-padded">
            <p className="text-sm text-text-muted">Memuat pengajuan...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="card card-padded text-center">
            <p className="text-sm text-text-muted">
              Tidak ada pengajuan dengan status ini.
            </p>
          </div>
        ) : (
          <div className="card divide-y divide-border">
            {requests.map((request) => {
              const token = getAccessToken() ?? "";
              const isExpanded = expandedId === request.id;
              const isCompleting = completingId === request.id;

              return (
                <article key={request.id}>
                  <button
                    type="button"
                    onClick={() => toggleExpand(request.id)}
                    className="flex w-full items-start justify-between gap-4 px-6 py-4 text-left hover:bg-surface-muted transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-text-primary">
                        {request.title}
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        <span className="font-medium">
                          {request.requestNumber}
                        </span>{" "}
                        · {request.serviceName}
                      </p>
                      {request.description ? (
                        <p className="mt-1 line-clamp-1 text-xs text-text-disabled">
                          {request.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={request.status} />
                      <ChevronIcon expanded={isExpanded} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border bg-surface-muted px-6 py-5 space-y-5">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                          Dokumen
                        </p>
                        <FileSection
                          token={token}
                          requestId={request.id}
                          canUploadFinal={request.status === "APPROVED"}
                        />
                      </div>

                      {request.status === "APPROVED" && (
                        <div className="space-y-3 border-t border-border pt-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Selesaikan Pengajuan
                          </p>
                          <textarea
                            className="form-textarea min-h-20"
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
                            className="btn btn-success"
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

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
