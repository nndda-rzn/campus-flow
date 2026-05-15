"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getAccessToken } from "@/lib/auth-storage";
import {
  AcademicDashboard,
  SupervisorDashboard,
  getAcademicReport,
  getSupervisorReport,
} from "@/lib/reporting-api";

export default function ReportsPage() {
  const [academic, setAcademic] = useState<AcademicDashboard | null>(null);
  const [supervisor, setSupervisor] = useState<SupervisorDashboard | null>(
    null,
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      const token = getAccessToken();
      if (!token) return;

      const [academicResponse, supervisorResponse] = await Promise.all([
        getAcademicReport(token),
        getSupervisorReport(token),
      ]);

      setAcademic(academicResponse.data ?? null);
      setSupervisor(supervisorResponse.data ?? null);
    }

    loadReports()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Gagal memuat laporan"),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <ProtectedPage
      title="Reporting Dashboard"
      description="Dashboard ringkas dari read model Reporting Service."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI", "TATA_USAHA"]}
    >
      {error ? <div className="mb-6 alert alert-danger">{error}</div> : null}

      <div className="space-y-6">
        {/* Section: Academic Requests */}
        <section>
          <SectionHeader
            title="Layanan Akademik"
            description="Distribusi status pengajuan layanan akademik mahasiswa."
          />
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Metric
              label="Total"
              value={academic?.totalRequests ?? 0}
              status="primary"
              isLoading={isLoading}
            />
            <Metric
              label="Diajukan"
              value={academic?.submittedRequests ?? 0}
              status="SUBMITTED"
              isLoading={isLoading}
            />
            <Metric
              label="Diverifikasi"
              value={academic?.verifiedRequests ?? 0}
              status="VERIFIED"
              isLoading={isLoading}
            />
            <Metric
              label="Disetujui"
              value={academic?.approvedRequests ?? 0}
              status="APPROVED"
              isLoading={isLoading}
            />
            <Metric
              label="Ditolak"
              value={academic?.rejectedRequests ?? 0}
              status="REJECTED"
              isLoading={isLoading}
            />
            <Metric
              label="Selesai"
              value={academic?.completedRequests ?? 0}
              status="COMPLETED"
              isLoading={isLoading}
            />
          </div>
        </section>

        {/* Section: Supervisor Requests */}
        <section>
          <SectionHeader
            title="Pengajuan Dosen Pembimbing"
            description="Distribusi status pengajuan pembimbing skripsi/tugas akhir."
          />
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Metric
              label="Total"
              value={supervisor?.totalRequests ?? 0}
              status="primary"
              isLoading={isLoading}
            />
            <Metric
              label="Diajukan"
              value={supervisor?.submittedRequests ?? 0}
              status="SUBMITTED"
              isLoading={isLoading}
            />
            <Metric
              label="Diverifikasi"
              value={supervisor?.verifiedRequests ?? 0}
              status="VERIFIED"
              isLoading={isLoading}
            />
            <Metric
              label="Ditugaskan"
              value={supervisor?.assignedRequests ?? 0}
              status="ASSIGNED"
              isLoading={isLoading}
            />
            <Metric
              label="Diterima"
              value={supervisor?.acceptedRequests ?? 0}
              status="ACCEPTED"
              isLoading={isLoading}
            />
            <Metric
              label="Ditolak"
              value={supervisor?.rejectedRequests ?? 0}
              status="REJECTED"
              isLoading={isLoading}
            />
          </div>
        </section>
      </div>
    </ProtectedPage>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      ) : null}
    </div>
  );
}

type MetricProps = {
  label: string;
  value: number;
  status: string;
  isLoading: boolean;
};

function Metric({ label, value, status, isLoading }: MetricProps) {
  // Map status to the colored accent strip on the left
  const accentColor: Record<string, string> = {
    primary: "bg-primary",
    SUBMITTED: "bg-[#2563eb]",
    VERIFIED: "bg-[#0891b2]",
    APPROVED: "bg-[#16a34a]",
    REJECTED: "bg-[#dc2626]",
    COMPLETED: "bg-[#059669]",
    ASSIGNED: "bg-[#4f46e5]",
    ACCEPTED: "bg-[#16a34a]",
  };

  return (
    <div className="card relative overflow-hidden">
      <div
        className={`absolute left-0 top-0 h-full w-1 ${accentColor[status] ?? "bg-secondary"}`}
      />
      <div className="px-4 py-4 pl-5">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold text-text-primary tabular-nums">
          {isLoading ? (
            <span className="inline-block h-6 w-12 animate-pulse rounded bg-background-alt"></span>
          ) : (
            value.toLocaleString()
          )}
        </p>
      </div>
    </div>
  );
}
