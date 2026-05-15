/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { FileSection } from "@/components/academic/file-section";
import { getAccessToken } from "@/lib/auth-storage";
import {
  AcademicRequest,
  AcademicServiceItem,
  createAcademicRequest,
  listAcademicServices,
  listMyAcademicRequests,
} from "@/lib/academic-api";

export default function StudentAcademicRequestsPage() {
  const [services, setServices] = useState<AcademicServiceItem[]>([]);
  const [requests, setRequests] = useState<AcademicRequest[]>([]);
  const [serviceCode, setServiceCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(
    null,
  );

  async function loadData() {
    const token = getAccessToken();
    if (!token) return;

    const [servicesResponse, requestsResponse] = await Promise.all([
      listAcademicServices(token),
      listMyAcademicRequests(token),
    ]);

    setServices(servicesResponse.data?.services ?? []);
    setRequests(requestsResponse.data?.requests ?? []);

    const firstService = servicesResponse.data?.services?.[0];
    if (firstService && !serviceCode) {
      setServiceCode(firstService.code);
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
      await createAcademicRequest(token, {
        service_code: serviceCode,
        title,
        description,
      });

      setTitle("");
      setDescription("");
      setMessage("Pengajuan berhasil dibuat.");

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pengajuan");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleExpand(requestId: string) {
    setExpandedRequestId((prev) => (prev === requestId ? null : requestId));
  }

  return (
    <ProtectedPage
      title="Pengajuan Layanan Akademik"
      description="Buat dan pantau status pengajuan layanan akademik."
      allowedRoles={["MAHASISWA"]}
    >
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* ── Form Buat Pengajuan ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Buat Pengajuan</h2>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Jenis Layanan
              </label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                value={serviceCode}
                onChange={(event) => setServiceCode(event.target.value)}
                required
              >
                {services.map((service) => (
                  <option key={service.id} value={service.code}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Judul Pengajuan
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Contoh: Pengajuan Surat Aktif Kuliah"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Deskripsi
              </label>
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tuliskan kebutuhan pengajuan..."
              />
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
              disabled={isLoading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {isLoading ? "Menyimpan..." : "Buat Pengajuan"}
            </button>
          </form>
        </section>

        {/* ── Riwayat Pengajuan ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Riwayat Pengajuan</h2>

          <div className="mt-5 space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-slate-500">
                Belum ada pengajuan layanan akademik.
              </p>
            ) : (
              requests.map((request) => {
                const token = getAccessToken() ?? "";
                const isExpanded = expandedRequestId === request.id;

                return (
                  <article
                    key={request.id}
                    className="rounded-xl border border-slate-200"
                  >
                    {/* Header card */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(request.id)}
                      className="flex w-full items-start justify-between gap-4 p-4 text-left"
                    >
                      <div>
                        <h3 className="font-medium text-slate-900">
                          {request.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {request.requestNumber} · {request.serviceName}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={request.status} />
                        <span className="text-xs text-slate-400">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>

                    {/* Expanded: deskripsi + file section */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                        {request.description ? (
                          <p className="mb-4 text-sm leading-6 text-slate-600">
                            {request.description}
                          </p>
                        ) : null}

                        <FileSection
                          token={token}
                          requestId={request.id}
                          canUploadSupporting={true}
                        />
                      </div>
                    )}
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
