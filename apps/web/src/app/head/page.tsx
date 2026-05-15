import { ProtectedPage } from "@/components/layout/protected-page";
import { DashboardCard } from "@/components/ui/dashboard-card";

export default function HeadDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Kaprodi"
      description="Approval layanan akademik dan penetapan dosen pembimbing."
      allowedRoles={["KAPRODI"]}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          href="/head/academic-requests"
          title="Layanan Akademik"
          description="Setujui atau tolak pengajuan layanan akademik yang sudah diverifikasi Admin Prodi."
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
              <path d="m9 11 3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          }
        />

        <DashboardCard
          href="/head/supervisor-requests"
          title="Dosen Pembimbing"
          description="Tetapkan dosen pembimbing untuk pengajuan yang sudah diverifikasi Admin Prodi."
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
