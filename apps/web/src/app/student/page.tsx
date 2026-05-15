import Link from "next/link";
import { ProtectedPage } from "@/components/layout/protected-page";

export default function StudentDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Mahasiswa"
      description="Kelola pengajuan layanan akademik dan pengajuan dosen pembimbing."
      allowedRoles={["MAHASISWA"]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/student/academic-requests"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-400"
        >
          <h2 className="font-semibold text-slate-900">
            Pengajuan Layanan Akademik
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Buat dan lihat status pengajuan surat aktif kuliah, magang,
            penelitian, dan rekomendasi.
          </p>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Pengajuan Dosen Pembimbing
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Modul UI akan dibuat setelah halaman layanan akademik stabil.
          </p>
        </div>
      </div>
    </ProtectedPage>
  );
}
