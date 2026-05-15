import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Workflow Approval",
    description: "Verifikasi berlapis Admin Prodi → Kaprodi → Tata Usaha.",
  },
  {
    icon: BellRing,
    title: "Notifikasi Real-time",
    description: "Update status pengajuan langsung tanpa refresh.",
  },
  {
    icon: Activity,
    title: "Audit Trail Lengkap",
    description: "Setiap aksi tercatat untuk kepatuhan internal.",
  },
  {
    icon: BarChart3,
    title: "Reporting Dashboard",
    description: "Distribusi & analitik pengajuan dengan visualisasi.",
  },
  {
    icon: FileText,
    title: "Document Management",
    description: "Upload, simpan, dan distribusi dokumen final.",
  },
  {
    icon: Sparkles,
    title: "Microservices Architecture",
    description: "Skalabel, resilient, observabel.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-text-inverse text-[12px] font-bold tracking-tight">
              CF
            </div>
            <div>
              <p className="text-[15px] font-semibold leading-none tracking-tight text-text-primary">
                CampusFlow
              </p>
              <p className="mt-1 text-[11px] leading-none text-text-muted">
                Academic System
              </p>
            </div>
          </div>

          <Button asChild size="sm">
            <Link href="/login">
              Masuk
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </header>

        {/* Hero */}
        <section className="flex flex-1 items-center py-12 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11.5px] font-medium text-text-secondary shadow-sm">
              <span className="size-1.5 rounded-full bg-accent" />
              Academic Service System · v1.0
            </span>

            <h1 className="mt-6 text-[32px] font-semibold leading-[1.1] tracking-tight text-text-primary md:text-[48px]">
              Layanan akademik kampus
              <br />
              <span className="text-primary">dalam satu platform terpadu.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-[14.5px] leading-relaxed text-text-secondary md:text-[15.5px]">
              Kelola pengajuan surat akademik, workflow approval berlapis,
              penetapan dosen pembimbing, notifikasi real-time, dan reporting
              secara terintegrasi.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-2.5">
              <Button asChild size="lg">
                <Link href="/login">
                  Masuk ke Sistem
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="#features">Pelajari Fitur</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section
          id="features"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <span className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary">
                <feature.icon className="size-4" />
              </span>
              <h3 className="mt-3 text-[14px] font-semibold leading-tight tracking-tight text-text-primary">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </section>

        {/* CTA strip */}
        <section className="my-10 rounded-lg border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-success-soft text-success">
                <CheckCircle2 className="size-4" />
              </span>
              <div>
                <p className="text-[14px] font-semibold leading-tight tracking-tight text-text-primary">
                  Siap dipakai untuk kebutuhan internal kampus
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-text-muted">
                  Login dengan akun yang sudah disediakan oleh Admin Prodi.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/login">
                Masuk
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-5 text-center">
          <p className="text-[12px] text-text-muted">
            © 2026 CampusFlow · Academic Service & Supervisor Request System
          </p>
        </footer>
      </div>
    </main>
  );
}
