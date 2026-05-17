"use client";

import { ProtectedPage } from "@/components/layout/protected-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, UserCircle2 } from "lucide-react";
import { clearAuthSession, getCurrentUser } from "@/lib/auth-storage";

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

  function handleLogout() {
    clearAuthSession();
    router.replace("/login");
  }

  if (!user) {
    return null;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
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
