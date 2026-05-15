import { ProtectedPage } from "@/components/layout/protected-page";

export default function LecturerDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Dosen"
      description="Kelola permintaan sebagai dosen pembimbing."
      allowedRoles={["DOSEN"]}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Menu Dosen</h2>
        <p className="mt-2 text-sm text-slate-600">
          Halaman accept/reject penetapan dosen pembimbing akan dibuat pada
          tahap UI supervisor.
        </p>
      </div>
    </ProtectedPage>
  );
}
