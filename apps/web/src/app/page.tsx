import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <p className="mb-3 text-sm font-medium text-slate-500">
            Academic Service & Supervisor Request System
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            CampusFlow
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Platform layanan akademik kampus untuk pengajuan surat akademik,
            approval workflow, pengajuan dosen pembimbing, notifikasi, dokumen,
            dan reporting.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/login"
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Masuk ke Sistem
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
