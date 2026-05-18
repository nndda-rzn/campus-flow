"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { listLecturers, Lecturer } from "@/lib/supervisor-api";
import { getAccessToken } from "@/lib/auth-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function LecturersPage() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [filteredLecturers, setFilteredLecturers] = useState<Lecturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      const token = getAccessToken();
      if (!token) return;

      try {
        const res = await listLecturers(token);
        const data = res.data?.lecturers || [];
        setLecturers(data);
        setFilteredLecturers(data);
      } catch (err) {
        toast.error("Gagal memuat direktori dosen", {
          description: err instanceof Error ? err.message : "Silakan coba lagi nanti",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredLecturers(lecturers);
    } else {
      const q = search.toLowerCase();
      setFilteredLecturers(
        lecturers.filter(
          (l) => 
            l.fullName.toLowerCase().includes(q) || 
            l.nidn.toLowerCase().includes(q)
        )
      );
    }
  }, [search, lecturers]);

  return (
    <ProtectedPage
      title="Direktori Dosen"
      description="Cari dosen pembimbing dan lihat profil mereka."
      allowedRoles={["MAHASISWA"]}
    >
      <div className="space-y-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-text-muted" />
          </div>
          <Input
            type="search"
            placeholder="Cari berdasarkan nama atau NIDN..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredLecturers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                title="Dosen tidak ditemukan"
                description={
                  search 
                    ? `Tidak ada dosen yang cocok dengan pencarian "${search}".` 
                    : "Belum ada data dosen di sistem."
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredLecturers.map((lecturer) => (
              <Card key={lecturer.id} className="overflow-hidden transition-all hover:shadow-md">
                <CardContent className="p-0">
                  <div className="p-5 flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[16px] font-semibold text-primary border border-primary/20">
                      {lecturer.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[15px] text-text-primary truncate" title={lecturer.fullName}>
                        {lecturer.fullName}
                      </h3>
                      <p className="text-[13px] text-text-muted mt-0.5">
                        NIDN: {lecturer.nidn || "-"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-background-alt px-5 py-3 border-t border-border flex items-center justify-between">
                    <span className="text-[12px] font-medium text-text-secondary uppercase tracking-wider">
                      Kuota Bimbingan
                    </span>
                    <Badge variant={lecturer.maxSupervisorQuota > 0 ? "success" : "danger"} className="rounded-sm">
                      {lecturer.maxSupervisorQuota} / {lecturer.maxSupervisorQuota}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
