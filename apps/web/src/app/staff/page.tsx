import { ProtectedPage } from "@/components/layout/protected-page";

export default function StaffDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Tata Usaha"
      description="Upload dokumen final dan selesaikan pengajuan akademik."
      allowedRoles={["TATA_USAHA"]}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Menu Tata Usaha</h2>
        <p className="mt-2 text-sm text-slate-600">
          Halaman upload dokumen final akan dibuat setelah halaman request
          mahasiswa.
        </p>
      </div>
    </ProtectedPage>
  );
}
