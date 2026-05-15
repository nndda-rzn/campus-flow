"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth-api";
import { saveAuthSession } from "@/lib/auth-storage";
import { getDashboardPathByRole } from "@/lib/role-redirect";

const DEMO_ACCOUNTS = [
  { role: "Mahasiswa", email: "mahasiswa@campusflow.test" },
  { role: "Admin Prodi", email: "adminprodi@campusflow.test" },
  { role: "Kaprodi", email: "kaprodi@campusflow.test" },
  { role: "Tata Usaha", email: "tu@campusflow.test" },
  { role: "Dosen", email: "dosen1@campusflow.test" },
];

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("mahasiswa@campusflow.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await login({ email, password });

      if (!response.success || !response.data) {
        throw new Error(response.message || "Login gagal");
      }

      saveAuthSession(response.data);
      router.push(getDashboardPathByRole(response.data.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-background">
      {/* ── Left panel — brand showcase ── */}
      <aside className="hidden flex-col justify-between bg-secondary p-12 text-text-inverse lg:flex lg:w-1/2 xl:w-2/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-bold">
            CF
          </div>
          <span className="text-lg font-bold">CampusFlow</span>
        </div>

        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Layanan Akademik Terintegrasi
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-secondary-soft">
            Kelola pengajuan layanan akademik dan dosen pembimbing dalam satu
            sistem terpadu yang dirancang untuk efisiensi internal kampus.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            <FeatureItem icon="✓" title="Workflow Approval" />
            <FeatureItem icon="✓" title="Notifikasi Real-time" />
            <FeatureItem icon="✓" title="Audit Log Lengkap" />
            <FeatureItem icon="✓" title="Reporting Dashboard" />
          </div>
        </div>

        <p className="text-xs text-text-disabled">
          © 2026 CampusFlow · Academic Service System
        </p>
      </aside>

      {/* ── Right panel — login form ── */}
      <section className="flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-text-inverse text-base font-bold">
                CF
              </div>
              <span className="text-lg font-bold text-text-primary">
                CampusFlow
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-text-primary">
            Selamat Datang
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Masuk untuk mengakses sistem layanan akademik.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@campusflow.test"
                required
              />
            </div>

            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error ? <div className="alert alert-danger">{error}</div> : null}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8 rounded-lg border border-border bg-surface-muted p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Akun Demo (password: password123)
            </p>
            <div className="space-y-1">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("password123");
                  }}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-background-alt transition-colors"
                >
                  <span className="font-medium text-text-secondary">
                    {acc.role}
                  </span>
                  <span className="text-text-muted">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureItem({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-text-inverse">
        {icon}
      </span>
      <span className="text-sm text-secondary-soft">{title}</span>
    </div>
  );
}
