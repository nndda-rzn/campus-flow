"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccessToken, getCurrentUser } from "@/lib/auth-storage";
import { cn } from "@/lib/cn";

type LecturerProfile = {
  id: string;
  userId: string;
  nidn: string;
  fullName: string;
  email: string;
  departmentId: string;
  departmentName: string;
  status: string;
  maxSupervisorQuota: number;
  currentQuotaUsed: number;
  createdAt: string;
  updatedAt: string;
};

export default function LecturerProfilePage() {
  return (
    <ProtectedPage
      title="Profil Saya"
      description="Kelola informasi profil dosen Anda."
      allowedRoles={["DOSEN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [profile, setProfile] = useState<LecturerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    nidn: "",
  });

  async function load() {
    const token = getAccessToken();
    const user = getCurrentUser();
    if (!token || !user) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/lecturer/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setProfile(data.data);
      setFormData({
        fullName: data.data.fullName,
        email: data.data.email,
        nidn: data.data.nidn,
      });
    } catch (err) {
      toast.error("Gagal memuat profil", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    const token = getAccessToken();
    if (!token) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/lecturer/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          nidn: formData.nidn,
        }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      toast.success("Profil berhasil diperbarui");
      setIsEditing(false);
      await load();
    } catch (err) {
      toast.error("Gagal memperbarui profil", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="p-8 text-center">
        <p className="text-text-muted">Profil tidak ditemukan</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Informasi Pribadi</h2>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Batal
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Menyimpan..." : "Simpan"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit</Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Lengkap</Label>
            {isEditing ? (
              <Input
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />
            ) : (
              <p className="text-text-secondary">{profile.fullName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            {isEditing ? (
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            ) : (
              <p className="text-text-secondary">{profile.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>NIDN</Label>
            {isEditing ? (
              <Input
                value={formData.nidn}
                onChange={(e) =>
                  setFormData({ ...formData, nidn: e.target.value })
                }
              />
            ) : (
              <p className="text-text-secondary">{profile.nidn || "—"}</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Informasi Departemen</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Departemen</Label>
            <p className="text-text-secondary">{profile.departmentName}</p>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <p
              className={cn(
                "text-sm font-medium",
                profile.status === "ACTIVE"
                  ? "text-status-success"
                  : "text-status-warning"
              )}
            >
              {profile.status === "ACTIVE" ? "Aktif" : "Tidak Aktif"}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Kuota Pembimbing</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Kuota Maksimal</Label>
            <p className="text-text-secondary">{profile.maxSupervisorQuota}</p>
          </div>
          <div className="space-y-2">
            <Label>Kuota Terpakai</Label>
            <p className="text-text-secondary">{profile.currentQuotaUsed}</p>
          </div>
          <div className="space-y-2">
            <Label>Sisa Kuota</Label>
            <p className="text-text-secondary">
              {profile.maxSupervisorQuota - profile.currentQuotaUsed}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
