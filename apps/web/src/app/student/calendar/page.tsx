"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getAcademicCalendar, AcademicCalendarItem } from "@/lib/calendar-api";
import { getAccessToken } from "@/lib/auth-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function CalendarPage() {
  const [events, setEvents] = useState<AcademicCalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const token = getAccessToken();
      if (!token) return;

      try {
        const res = await getAcademicCalendar(token);
        setEvents(res.data?.items || []);
      } catch (err) {
        toast.error("Gagal memuat kalender", {
          description: err instanceof Error ? err.message : "Silakan coba lagi nanti",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Format date helper
  const formatDate = (dateStr: string, isEnd = false) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "UTS":
      case "UAS":
        return <Badge variant="danger">{type}</Badge>;
      case "REGISTRATION":
        return <Badge variant="info">Pendaftaran</Badge>;
      case "HOLIDAY":
        return <Badge variant="success">Libur</Badge>;
      case "DEADLINE":
        return <Badge variant="warning">Tenggat Waktu</Badge>;
      case "SEMINAR":
        return <Badge variant="accent">Seminar</Badge>;
      default:
        return <Badge variant="outline">Umum</Badge>;
    }
  };

  return (
    <ProtectedPage
      title="Kalender Akademik"
      description="Jadwal dan agenda penting akademik selama perkuliahan berlangsung."
      allowedRoles={["MAHASISWA"]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Agenda Mendatang</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : events.length === 0 ? (
            <EmptyState
              title="Tidak ada agenda"
              description="Belum ada agenda akademik yang dijadwalkan."
            />
          ) : (
            <div className="relative border-l-2 border-border ml-3 space-y-8">
              {events.map((event) => (
                <div key={event.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <span className="absolute -left-[9px] top-1.5 flex h-4 w-4 rounded-full bg-primary ring-4 ring-surface" />
                  
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-text-primary text-[15px]">{event.title}</h3>
                        {getEventBadge(event.eventType)}
                      </div>
                      
                      <div className="text-[13px] text-text-secondary font-medium">
                        {formatDate(event.startDate)}
                        {event.endDate && event.endDate !== event.startDate && (
                          <> — {formatDate(event.endDate)}</>
                        )}
                      </div>
                      
                      {event.description && (
                        <p className="mt-2 text-[13.5px] text-text-secondary">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </ProtectedPage>
  );
}
