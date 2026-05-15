import Link from "next/link";
import { ProtectedPage } from "@/components/layout/protected-page";

export default function AdminDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Admin Prodi"
      description="Verifikasi pengajuan layanan akademik dan pengajuan dosen pembimbing."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI"]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/supervisor-requests"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-400"
        >
          <h2 className="font-semibold text-slate-900">
            Verifikasi Pengajuan Pembimbing
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Verifikasi pengajuan dosen pembimbing sebelum Kaprodi menetapkan
            dosen.
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
