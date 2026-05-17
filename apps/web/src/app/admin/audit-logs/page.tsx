"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, RefreshCw, Search, Shield } from "lucide-react";
import { toast } from "sonner";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAccessToken } from "@/lib/auth-storage";
import { listAuditLogs, type AuditLogItem } from "@/lib/admin-api";
import { cn } from "@/lib/cn";

const ENTITY_TYPES = [
  { value: "users", label: "users" },
  { value: "service_requests", label: "service_requests" },
  { value: "supervisor_requests", label: "supervisor_requests" },
];

export default function AdminAuditLogsPage() {
  return (
    <ProtectedPage
      title="Audit Log"
      description="Aktivitas penting dari auth-service dan academic-service yang sudah tercatat."
      allowedRoles={["SUPER_ADMIN"]}
    >
      <PageContent />
    </ProtectedPage>
  );
}

function PageContent() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [partialErrors, setPartialErrors] = useState<{
    auth: string;
    academic: string;
  }>({ auth: "", academic: "" });
  const [isLoading, setIsLoading] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await listAuditLogs(token, {
        entity_type: entityType || undefined,
        limit: 200,
      });
      setItems(res.data?.items ?? []);
      setPartialErrors({
        auth: res.data?.authError ?? "",
        academic: res.data?.academicError ?? "",
      });
    } catch (err) {
      toast.error("Gagal memuat audit log", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.action.toLowerCase().includes(q) ||
        it.entityType.toLowerCase().includes(q) ||
        it.actorUserId.toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari action, entity, atau actor..."
            className="h-9 pl-8"
          />
        </div>
        <Select
          value={entityType || "ALL"}
          onValueChange={(v) => setEntityType(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="h-9 w-full sm:w-56">
            <SelectValue placeholder="Semua entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua entity</SelectItem>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => load()}
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {(partialErrors.auth || partialErrors.academic) && (
        <Card className="border-warning bg-warning-soft p-3">
          <p className="text-[12.5px] text-warning-text">
            <Shield className="mr-1 inline size-3.5 align-text-bottom" />
            Sebagian audit log tidak bisa dimuat:
            {partialErrors.auth ? ` auth (${partialErrors.auth})` : ""}
            {partialErrors.academic
              ? ` academic (${partialErrors.academic})`
              : ""}
          </p>
        </Card>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-4" />}
            title="Belum ada audit log"
            description="Tidak ada catatan audit yang cocok dengan filter."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Waktu</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((it) => (
                <TableRow key={`${it.sourceService}-${it.id}`}>
                  <TableCell>
                    <span className="font-mono text-[12px] text-text-secondary">
                      {it.createdAt}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        it.sourceService === "auth" ? "info" : "accent"
                      }
                    >
                      {it.sourceService}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[12.5px] text-text-primary">
                      {it.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[12.5px] text-text-secondary">
                      {it.entityType}
                    </span>
                    {it.entityId ? (
                      <p className="mt-0.5 font-mono text-[10.5px] text-text-muted">
                        {it.entityId.slice(0, 8)}…
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[11.5px] text-text-secondary">
                      {it.actorUserId
                        ? it.actorUserId.slice(0, 8) + "…"
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <details className="text-[11.5px]">
                      <summary className="cursor-pointer text-text-muted hover:text-text-primary">
                        view
                      </summary>
                      <pre className="mt-1 overflow-x-auto rounded bg-background-alt p-2 font-mono text-[10.5px] text-text-secondary">
                        {prettyJson(it.metadataJson)}
                      </pre>
                    </details>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function prettyJson(raw: string): string {
  if (!raw) return "{}";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
