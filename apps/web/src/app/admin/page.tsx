import { ProtectedPage } from "@/components/layout/protected-page";
import { DashboardCard } from "@/components/ui/dashboard-card";

export default function AdminDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Admin Prodi"
      description="Verifikasi pengajuan layanan akademik dan dosen pembimbing."
      allowedRoles={["SUPER_ADMIN", "ADMIN_PRODI"]}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          href="/admin/academic-requests"
          title="Layanan Akademik"
          description="Verifikasi pengajuan layanan akademik mahasiswa sebelum di-approve oleh Kaprodi."
          accent="primary"
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="m9 15 2 2 4-4" />
            </svg>
          }
        />

        <DashboardCard
          href="/admin/supervisor-requests"
          title="Dosen Pembimbing"
          description="Verifikasi pengajuan dosen pembimbing sebelum Kaprodi menetapkan dosen."
          accent="accent"
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
          }
        />

        <DashboardCard
          href="/reports"
          title="Reporting"
          description="Lihat dashboard distribusi status pengajuan akademik dan pembimbing."
          accent="info"
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          }
        />
      </div>
    </ProtectedPage>
  );
}
