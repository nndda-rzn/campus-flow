import { ProtectedPage } from "@/components/layout/protected-page";
import { DashboardCard } from "@/components/ui/dashboard-card";

export default function LecturerDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Dosen"
      description="Kelola permintaan sebagai dosen pembimbing."
      allowedRoles={["DOSEN"]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DashboardCard
          href="/lecturer/supervisor-requests"
          title="Permintaan Pembimbing"
          description="Lihat penetapan pembimbing dari Kaprodi dan lakukan accept atau reject."
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="17 11 19 13 23 9" />
            </svg>
          }
        />
      </div>
    </ProtectedPage>
  );
}
