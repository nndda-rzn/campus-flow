"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { login } from "@/lib/auth-api";
import { saveAuthSession } from "@/lib/auth-storage";
import { getDashboardPathByRole } from "@/lib/role-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
  { role: "Mahasiswa", email: "mahasiswa@campusflow.test" },
  { role: "Admin Prodi", email: "adminprodi@campusflow.test" },
  { role: "Kaprodi", email: "kaprodi@campusflow.test" },
  { role: "Tata Usaha", email: "tu@campusflow.test" },
  { role: "Dosen", email: "dosen1@campusflow.test" },
];

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
    icon: Sparkles,
    title: "Reporting Insight",
    description: "Dashboard distribusi pengajuan dan SLA.",
  },
];

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("mahasiswa@campusflow.test");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await login({ email, password });

      if (!response.success || !response.data) {
        throw new Error(response.message || "Login gagal");
      }

      saveAuthSession(response.data);
      toast.success("Login berhasil", {
        description: `Selamat datang, ${response.data.user.fullName}`,
      });
      router.push(getDashboardPathByRole(response.data.user.role));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login gagal";
      toast.error("Login gagal", { description: message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {/* ── Left panel — academic editorial showcase ── */}
      <aside className="relative hidden overflow-hidden bg-primary p-10 text-text-inverse lg:flex lg:flex-col lg:justify-between xl:p-14">
        {/* Subtle paper grain overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />
        {/* Soft glow accents */}
        <div
          className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(3,105,161,0.55) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-32 size-96 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 70%)",
          }}
        />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
            <span className="font-display text-[16px] font-semibold tracking-tight">
              CF
            </span>
          </div>
          <div>
            <p className="font-display text-[18px] font-semibold tracking-tight leading-none">
              CampusFlow
            </p>
            <p className="mt-1.5 text-[10.5px] uppercase tracking-[0.16em] leading-none text-white/60">
              Academic Service Suite
            </p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.14em] font-medium text-white/70 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-accent" />
            v1.0 — Production Grade
          </span>
          <h2 className="mt-6 font-display text-[40px] font-semibold leading-[1.08] tracking-tight xl:text-[46px]">
            Tata kelola akademik
            <br />
            yang{" "}
            <span className="italic text-white/95">
              terstruktur &amp; terlacak.
            </span>
          </h2>
          <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-white/70">
            Platform end-to-end untuk pengajuan layanan akademik dan penetapan
            dosen pembimbing — dengan workflow approval berlapis, audit log, dan
            event-driven notification.
          </p>

          <ul className="mt-9 space-y-4">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-start gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-accent backdrop-blur-sm">
                  <feature.icon className="size-4" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold leading-tight text-white">
                    {feature.title}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-white/65">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer attribution */}
        <div className="relative space-y-2 text-[11px] uppercase tracking-[0.14em] text-white/45">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-white/20" />
            <span>Trusted by Academic Programs</span>
          </div>
          <p className="text-[11px] tracking-normal text-white/50 normal-case">
            © 2026 CampusFlow · Akuntabilitas akademik dengan jejak audit.
          </p>
        </div>
      </aside>

      {/* ── Right panel — login form ── */}
      <section className="flex items-center justify-center bg-background px-6 py-10 lg:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-primary text-text-inverse">
                <span className="font-display text-[15px] font-semibold tracking-tight">
                  CF
                </span>
              </div>
              <span className="font-display text-[18px] font-semibold tracking-tight text-text-primary">
                CampusFlow
              </span>
            </div>
          </div>

          <div>
            <span className="text-eyebrow">Sign In</span>
            <h1 className="mt-2 font-display text-[30px] font-semibold leading-[1.15] tracking-tight text-text-primary">
              Selamat datang kembali
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
              Masuk untuk mengakses sistem layanan akademik dengan akun
              kampus Anda.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@campusflow.test"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="inline-flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="size-3.5" />
                      Sembunyikan
                    </>
                  ) : (
                    <>
                      <Eye className="size-3.5" />
                      Lihat
                    </>
                  )}
                </button>
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              loading={isLoading}
              size="lg"
              className="w-full"
            >
              {isLoading ? "Memproses..." : "Masuk ke CampusFlow"}
              {!isLoading ? <ArrowRight className="size-4" /> : null}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-7 rounded-md border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
              <CheckCircle2 className="size-3.5 text-accent" />
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                Akun Demo
              </p>
              <span className="ml-auto rounded-sm border border-border bg-background-alt px-1.5 py-0.5 font-mono text-[10.5px] text-text-secondary">
                password123
              </span>
            </div>
            <div className="p-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("password123");
                  }}
                  className="group flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-background-alt"
                >
                  <span className="text-[12.5px] font-medium text-text-primary">
                    {acc.role}
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-text-muted group-hover:text-text-secondary">
                    {acc.email}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
