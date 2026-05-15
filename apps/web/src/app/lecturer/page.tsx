import Link from "next/link";
import { ProtectedPage } from "@/components/layout/protected-page";

export default function LecturerDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Dosen"
      description="Kelola permintaan sebagai dosen pembimbing."
      allowedRoles={["DOSEN"]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/lecturer/supervisor-requests"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-400"
        >
          <h2 className="font-semibold text-slate-900">
            Permintaan Pembimbing
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Lihat penetapan pembimbing dan lakukan accept atau reject.
          </p>
        </Link>
      </div>
    </ProtectedPage>
  );
}
