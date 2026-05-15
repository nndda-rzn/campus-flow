import { ProtectedPage } from "@/components/layout/protected-page";
import { DashboardCard } from "@/components/ui/dashboard-card";

export default function StudentDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Mahasiswa"
      description="Kelola pengajuan layanan akademik dan dosen pembimbing."
      allowedRoles={["MAHASISWA"]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DashboardCard
          href="/student/academic-requests"
          title="Layanan Akademik"
          description="Buat dan lihat status pengajuan surat aktif kuliah, magang, penelitian, dan rekomendasi."
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
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          }
        />

        <DashboardCard
          href="/student/supervisor-requests"
          title="Dosen Pembimbing"
          description="Ajukan topik tugas akhir dan pilih calon dosen pembimbing."
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
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
      </div>
    </ProtectedPage>
  );
}
