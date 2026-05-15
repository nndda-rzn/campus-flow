import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-12">
        {/* ── Header ── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-text-inverse text-base font-bold">
              CF
            </div>
            <span className="text-lg font-bold text-text-primary">
              CampusFlow
            </span>
          </div>

          <Link href="/login" className="btn btn-primary btn-sm">
            Masuk
          </Link>
        </header>

        {/* ── Hero ── */}
        <section className="flex flex-1 items-center justify-center py-12">
          <div className="max-w-3xl text-center">
            <span className="inline-block rounded-full bg-primary-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              Academic Service System
            </span>

            <h1 className="mt-6 text-3xl font-bold tracking-tight text-text-primary md:text-5xl">
              Layanan Akademik Kampus
              <span className="block text-primary">dalam Satu Platform</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary md:text-lg">
              Kelola pengajuan surat akademik, workflow approval, penetapan
              dosen pembimbing, notifikasi, dan reporting secara terintegrasi
              dengan arsitektur modern.
            </p>

            <div className="mt-10 flex justify-center gap-3">
              <Link href="/login" className="btn btn-primary">
                Masuk ke Sistem
              </Link>
            </div>

            {/* Feature pills */}
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              <FeaturePill>Workflow Approval</FeaturePill>
              <FeaturePill>Notifikasi Real-time</FeaturePill>
              <FeaturePill>Audit Log Lengkap</FeaturePill>
              <FeaturePill>Reporting Dashboard</FeaturePill>
              <FeaturePill>Document Management</FeaturePill>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-border pt-6 text-center text-xs text-text-muted">
          © 2026 CampusFlow · Academic Service & Supervisor Request System
        </footer>
      </div>
    </main>
  );
}

function FeaturePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-text-secondary shadow-sm">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-success"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {children}
    </span>
  );
}
