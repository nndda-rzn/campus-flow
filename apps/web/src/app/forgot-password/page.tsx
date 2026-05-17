"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/lib/auth-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email wajib diisi.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Format email tidak valid.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const resetURLBase =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;

      await forgotPassword({
        email: email.trim().toLowerCase(),
        reset_url_base: resetURLBase,
      });
      setSubmitted(true);
    } catch (err) {
      // Server is enumeration-safe — error here means network problem.
      toast.error("Tidak bisa mengirim permintaan", {
        description: err instanceof Error ? err.message : undefined,
      });
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
            Lupa password Anda?
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            Masukkan email akun Anda. Kami akan mengirim tautan reset
            password yang berlaku selama 30 menit.
          </p>
        </div>

        {submitted ? (
          <div className="mt-7 rounded-md border border-success bg-success-soft p-4 text-[13.5px] leading-relaxed text-success-text">
            <div className="flex items-start gap-2.5">
              <Mail className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Permintaan tercatat</p>
                <p className="mt-1">
                  Jika email <span className="font-mono">{email}</span> terdaftar
                  di sistem, instruksi reset password akan dikirim ke email
                  tersebut. Periksa kotak masuk dan folder spam Anda.
                </p>
                <p className="mt-2 text-[12.5px]">
                  Tautan berlaku 30 menit. Tidak menerima email setelah 5 menit?
                  Coba kirim ulang permintaan.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="nama@kampus.id"
                autoComplete="email"
                required
              />
            </div>
            {error && <p className="text-[12.5px] text-danger">{error}</p>}
            <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
              <KeyRound className="size-4" />
              Kirim Tautan Reset
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
