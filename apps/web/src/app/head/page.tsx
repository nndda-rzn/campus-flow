import Link from "next/link";
import { ProtectedPage } from "@/components/layout/protected-page";

export default function HeadDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Kaprodi"
      description="Approval layanan akademik dan penetapan dosen pembimbing."
      allowedRoles={["KAPRODI"]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/head/supervisor-requests"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-400"
        >
          <h2 className="font-semibold text-slate-900">
            Penetapan Dosen Pembimbing
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Tetapkan dosen pembimbing untuk pengajuan yang sudah diverifikasi.
          </p>
        </Link>

        <Link
          href="/reports"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-400"
        >
          <h2 className="font-semibold text-slate-900">Reporting</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Lihat dashboard pengajuan akademik dan pengajuan pembimbing.
          </p>
        </Link>
      </div>
    </ProtectedPage>
  );
}
