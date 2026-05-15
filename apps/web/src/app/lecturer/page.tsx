"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, GraduationCap, Inbox, Sparkles } from "lucide-react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAccessToken } from "@/lib/auth-storage";
import {
  SupervisorRequest,
  listLecturerSupervisorRequests,
} from "@/lib/supervisor-api";
import { cn } from "@/lib/cn";

export default function LecturerDashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard Dosen"
      description="Kelola permintaan sebagai dosen pembimbing dari Kaprodi."
      allowedRoles={["DOSEN"]}
    >
      <DashboardContent />
    </ProtectedPage>
  );
}

function DashboardContent() {
  const [requests, setRequests] = useState<SupervisorRequest[] | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    listLecturerSupervisorRequests(token)
      .then((res) => setRequests(res.data.requests))
      .catch(() => setRequests([]));
  }, []);

  const isLoading = requests === null;
  const assignedCount = requests
    ? requests.filter((r) => r.status === "ASSIGNED").length
    : 0;
  const acceptedCount = requests
    ? requests.filter((r) => r.status === "ACCEPTED").length
    : 0;

  const pending = requests
    ? requests.filter((r) => r.status === "ASSIGNED").slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTile
          label="Penetapan Baru"
          value={assignedCount}
          tone="text-warning"
          isLoading={isLoading}
        />
        <KpiTile
          label="Sedang Dibimbing"
          value={acceptedCount}
          tone="text-success"
          isLoading={isLoading}
        />
        <KpiTile
          label="Total Permintaan"
          value={requests?.length ?? 0}
          tone="text-text-primary"
          isLoading={isLoading}
        />
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-warning" />
              Penetapan Menunggu Keputusan
            </CardTitle>
            <p className="mt-0.5 text-[12.5px] text-text-muted">
              Penetapan dari Kaprodi yang menunggu Anda terima atau tolak
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/lecturer/supervisor-requests">
              Buka semua
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-4" />}
            title="Tidak ada penetapan baru"
            description="Penetapan dosen pembimbing dari Kaprodi akan muncul di sini."
          />
        ) : (
          <ul className="divide-y divide-border">
            {pending.map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-5 py-4">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <GraduationCap className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[13.5px] font-medium text-text-primary">
                    {r.topicTitle}
                  </p>
                  <p className="mt-0.5 font-mono text-[11.5px] text-text-muted">
                    {r.requestNumber}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function KpiTile({
  label,
  value,
  tone,
  isLoading,
}: {
  label: string;
  value: number;
  tone: string;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-text-muted">
          {label}
        </p>
        {isLoading ? (
          <Skeleton className="mt-2 h-7 w-16" />
        ) : (
          <p
            className={cn(
              "mt-1.5 text-[26px] font-semibold leading-none tracking-tight tabular-nums",
              tone,
            )}
          >
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
