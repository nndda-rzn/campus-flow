/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
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

  return (
    <ProtectedPage
      title="Pengajuan Layanan Akademik"
      description="Buat dan pantau status pengajuan layanan akademik."
      allowedRoles={["MAHASISWA"]}
    >
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Riwayat Pengajuan</h2>

          <div className="mt-5 space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-slate-500">
                Belum ada pengajuan layanan akademik.
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
                        {request.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {request.requestNumber} · {request.serviceName}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {request.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {request.description || "-"}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </ProtectedPage>
  );
}
