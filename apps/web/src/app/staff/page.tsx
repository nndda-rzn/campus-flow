import Link from "next/link";
import { ProtectedPage } from "@/components/layout/protected-page";

export default function StaffDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Tata Usaha"
      description="Upload dokumen final dan selesaikan pengajuan akademik."
      allowedRoles={["TATA_USAHA", "SUPER_ADMIN"]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/staff/academic-requests"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-400"
        >
          <h2 className="font-semibold text-slate-900">Pengajuan Akademik</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Upload dokumen final dan selesaikan pengajuan yang sudah disetujui
            oleh Kaprodi.
          </p>
        </Link>

        <Link
          href="/reports"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-400"
        >
          <h2 className="font-semibold text-slate-900">Reporting</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Lihat dashboard status pengajuan akademik.
          </p>
        </Link>
      </div>
    </ProtectedPage>
  );
}
