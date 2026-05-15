import { ProtectedPage } from "@/components/layout/protected-page";

export default function AdminDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Admin Prodi"
      description="Verifikasi pengajuan layanan akademik dan pengajuan dosen pembimbing."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI"]}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Menu Admin Prodi</h2>
        <p className="mt-2 text-sm text-slate-600">
          Halaman verifikasi akan dihubungkan ke endpoint workflow pada tahap UI
          berikutnya.
        </p>
      </div>
    </ProtectedPage>
  );
}
