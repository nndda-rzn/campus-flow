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

    loadReports().catch((err) => {
      setError(err instanceof Error ? err.message : "Gagal memuat laporan");
    });
  }, []);

  return (
    <ProtectedPage
      title="Reporting Dashboard"
      description="Dashboard ringkas dari read model Reporting Service."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI", "TATA_USAHA"]}
    >
      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Laporan Layanan Akademik
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric label="Total" value={academic?.totalRequests ?? 0} />
            <Metric
              label="Submitted"
              value={academic?.submittedRequests ?? 0}
            />
            <Metric label="Verified" value={academic?.verifiedRequests ?? 0} />
            <Metric label="Approved" value={academic?.approvedRequests ?? 0} />
            <Metric label="Rejected" value={academic?.rejectedRequests ?? 0} />
            <Metric
              label="Completed"
              value={academic?.completedRequests ?? 0}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Laporan Dosen Pembimbing
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric label="Total" value={supervisor?.totalRequests ?? 0} />
            <Metric
              label="Submitted"
              value={supervisor?.submittedRequests ?? 0}
            />
            <Metric
              label="Verified"
              value={supervisor?.verifiedRequests ?? 0}
            />
            <Metric
              label="Assigned"
              value={supervisor?.assignedRequests ?? 0}
            />
            <Metric
              label="Accepted"
              value={supervisor?.acceptedRequests ?? 0}
            />
            <Metric
              label="Rejected"
              value={supervisor?.rejectedRequests ?? 0}
            />
          </div>
        </section>
      </div>
    </ProtectedPage>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
