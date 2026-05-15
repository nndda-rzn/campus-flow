/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { FileSection } from "@/components/academic/file-section";
import { StatusBadge } from "@/components/ui/status-badge";
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

  function toggleExpand(id: string) {
    setExpandedRequestId((prev) => (prev === id ? null : id));
  }

  return (
    <ProtectedPage
      title="Pengajuan Layanan Akademik"
      description="Buat dan pantau status pengajuan layanan akademik."
      allowedRoles={["MAHASISWA"]}
    >
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* ── Form ── */}
        <section className="card card-padded h-fit">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Buat Pengajuan
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Isi formulir berikut untuk mengajukan layanan baru.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="form-label">Jenis Layanan</label>
              <select
                className="form-select"
                value={serviceCode}
                onChange={(e) => setServiceCode(e.target.value)}
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
              <label className="form-label">Judul Pengajuan</label>
              <input
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pengajuan Surat Aktif Kuliah"
                required
              />
            </div>

            <div>
              <label className="form-label">Deskripsi</label>
              <textarea
                className="form-textarea min-h-24"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan kebutuhan pengajuan..."
              />
            </div>

            {message ? (
              <div className="alert alert-success">{message}</div>
            ) : null}
            {error ? <div className="alert alert-danger">{error}</div> : null}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? "Menyimpan..." : "Buat Pengajuan"}
            </button>
          </form>
        </section>

        {/* ── List ── */}
        <section className="card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Riwayat Pengajuan
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Total {requests.length} pengajuan
              </p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {requests.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-text-muted">
                  Belum ada pengajuan layanan akademik.
                </p>
              </div>
            ) : (
              requests.map((request) => {
                const token = getAccessToken() ?? "";
                const isExpanded = expandedRequestId === request.id;

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
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <StatusBadge status={request.status} />
                        <ChevronIcon expanded={isExpanded} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border bg-surface-muted px-6 py-5">
                        {request.description ? (
                          <div className="mb-5">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                              Deskripsi
                            </p>
                            <p className="text-sm leading-6 text-text-secondary">
                              {request.description}
                            </p>
                          </div>
                        ) : null}

                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Dokumen
                          </p>
                          <FileSection
                            token={token}
                            requestId={request.id}
                            canUploadSupporting={true}
                          />
                        </div>
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
