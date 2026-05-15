"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth-api";
import { saveAuthSession } from "@/lib/auth-storage";
import { getDashboardPathByRole } from "@/lib/role-redirect";

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
      const response = await login({
        email,
        password,
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || "Login gagal");
      }

      saveAuthSession(response.data);

      const dashboardPath = getDashboardPathByRole(response.data.user.role);
      router.push(dashboardPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-medium text-slate-500">CampusFlow</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Login Sistem
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Masuk menggunakan akun role yang sudah dibuat melalui API Gateway.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="mahasiswa@campusflow.test"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="password123"
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Memproses..." : "Login"}
          </button>
        </form>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
          <p className="font-semibold text-slate-700">Akun demo:</p>
          <p>mahasiswa@campusflow.test</p>
          <p>adminprodi@campusflow.test</p>
          <p>kaprodi@campusflow.test</p>
          <p>tu@campusflow.test</p>
          <p>dosen1@campusflow.test</p>
        </div>
      </section>
    </main>
  );
}
