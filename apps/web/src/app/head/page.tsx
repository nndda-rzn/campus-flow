import { ProtectedPage } from "@/components/layout/protected-page";

export default function HeadDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Kaprodi"
      description="Approval layanan akademik dan penetapan dosen pembimbing."
      allowedRoles={["KAPRODI"]}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Menu Kaprodi</h2>
        <p className="mt-2 text-sm text-slate-600">
          Halaman approval dan assignment dosen pembimbing akan dibuat setelah
          dashboard dasar.
        </p>
      </div>
    </ProtectedPage>
  );
}
