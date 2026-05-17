"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, ShieldCheck, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearAuthSession,
  getAccessToken,
  getCurrentUser,
} from "@/lib/auth-storage";
import { changePassword } from "@/lib/auth-api";

export default function ProfilePage() {
  return (
    <ProtectedPage
      title="Profil"
      description="Detail akun yang sedang aktif. Beberapa perubahan dilakukan oleh Super Admin."
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const router = useRouter();
  const user = getCurrentUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleLogout() {
    clearAuthSession();
    router.replace("/login");
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (currentPassword === "" || newPassword === "" || confirmPassword === "") {
      setError("Semua field wajib diisi.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Password baru harus berbeda dari password lama.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError("Sesi habis, silakan login ulang.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await changePassword(token, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password berhasil diubah", {
        description: "Sesi lain Anda akan dipaksa logout. Silakan login ulang.",
      });
      // Force re-login because all refresh tokens were revoked.
      setTimeout(() => {
        clearAuthSession();
        router.replace("/login");
      }, 800);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengubah password",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle2 className="size-4 text-primary" />
              Informasi Akun
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Nama Lengkap" value={user.fullName} />
            <Field label="Email" value={user.email} mono />
            <Field label="User ID" value={user.userId} mono />
            <div className="space-y-1.5">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                Role
              </p>
              <Badge variant="info" className="font-mono">
                {user.role}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              Ubah Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Password Saat Ini</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (error) setError("");
                  }}
                  autoComplete="current-password"
                  required
                />
              </div>
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
              {error ? (
                <p className="text-[12.5px] text-danger">{error}</p>
              ) : (
                <p className="text-[11.5px] text-text-muted">
                  Mengubah password akan menutup semua sesi lain di perangkat
                  yang berbeda.
                </p>
              )}
              <Button type="submit" loading={isSubmitting}>
                <KeyRound className="size-3.5" />
                Simpan Password Baru
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-text-muted" />
            Sesi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-[13px] text-text-secondary">
          <p>
            Akses akun, perubahan email, dan penonaktifan dikelola oleh Super
            Admin. Hubungi tim administrasi jika butuh perubahan profil.
          </p>
          <Button variant="danger" onClick={handleLogout} className="w-full">
            <LogOut className="size-3.5" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
        {label}
      </p>
      <p
        className={
          mono
            ? "font-mono text-[13px] text-text-primary"
            : "text-[13.5px] font-medium text-text-primary"
        }
      >
        {value || "—"}
      </p>
    </div>
  );
}
