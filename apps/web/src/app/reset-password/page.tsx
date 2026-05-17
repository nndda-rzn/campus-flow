"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/auth-api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Token comes from query string ?token=... — read once on mount.
  useEffect(() => {
    const t = searchParams.get("token") ?? "";
    setToken(t);
  }, [searchParams]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!token) {
      setError("Token reset tidak ditemukan. Silakan ulangi proses lupa password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await resetPassword({ token, new_password: newPassword });
      setSuccess(true);
      toast.success("Password berhasil direset", {
        description: "Silakan login dengan password baru Anda.",
      });
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal reset password. Coba minta tautan baru.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-[420px]">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-[12.5px] text-text-muted hover:text-text-primary"
        >
          <ArrowLeft className="size-3.5" />
          Kembali ke login
        </Link>

        <div className="mt-6">
          <span className="text-eyebrow">Reset Password</span>
          <h1 className="mt-2 font-display text-[28px] font-semibold leading-[1.18] tracking-tight text-text-primary">
            Buat password baru
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            Masukkan password baru Anda. Setelah direset, semua sesi Anda di
            perangkat lain akan dipaksa logout.
          </p>
        </div>

        {success ? (
          <div className="mt-7 rounded-md border border-success bg-success-soft p-4 text-[13.5px] leading-relaxed text-success-text">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <p>Password berhasil direset. Mengarahkan ke halaman login…</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {!token && (
              <div className="rounded-md border border-danger bg-danger-soft p-3 text-[12.5px] text-danger-text">
                Token reset tidak ditemukan di URL. Silakan akses tautan reset
                lewat email yang Anda terima.
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="new-password">
                Password Baru{" "}
                <span className="font-normal text-text-muted">
                  (min. 8 karakter)
                </span>
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Konfirmasi Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            {error && <p className="text-[12.5px] text-danger">{error}</p>}
            <Button
              type="submit"
              loading={isSubmitting}
              size="lg"
              className="w-full"
              disabled={!token}
            >
              <KeyRound className="size-4" />
              Simpan Password Baru
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
