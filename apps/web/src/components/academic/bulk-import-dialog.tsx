"use client";

import { ChangeEvent, useState } from "react";
import { CheckCircle2, FileUp, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAccessToken } from "@/lib/auth-storage";
import {
  bulkImportLecturers,
  bulkImportStudents,
  type BulkImportResult,
  type BulkImportResultRow,
  type BulkLecturerRow,
  type BulkStudentRow,
} from "@/lib/admin-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "student" | "lecturer";
  onSuccess?: () => void;
};

const STUDENT_HEADERS = ["user_id", "email", "nim", "full_name", "department_code"];
const LECTURER_HEADERS = ["user_id", "email", "nidn", "full_name", "department_code", "max_supervisor_quota"];

const OUTCOME_VARIANT: Record<string, "success" | "info" | "danger" | "neutral"> = {
  CREATED: "success",
  UPDATED: "info",
  SKIPPED: "neutral",
  ERROR: "danger",
};

export function BulkImportDialog({ open, onOpenChange, type, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [parseError, setParseError] = useState("");
  const [preview, setPreview] = useState<BulkImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [committed, setCommitted] = useState(false);

  const headers = type === "student" ? STUDENT_HEADERS : LECTURER_HEADERS;
  const label = type === "student" ? "Mahasiswa" : "Dosen";

  function reset() {
    setFile(null);
    setParsedRows([]);
    setParseError("");
    setPreview(null);
    setCommitted(false);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParseError("");
    setPreview(null);
    setCommitted(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text, headers);
      if (rows.error) {
        setParseError(rows.error);
        setParsedRows([]);
      } else {
        setParsedRows(rows.data);
      }
    };
    reader.readAsText(f);
  }

  async function handleDryRun() {
    const token = getAccessToken();
    if (!token || parsedRows.length === 0) return;

    setIsLoading(true);
    try {
      const res = type === "student"
        ? await bulkImportStudents(token, {
            rows: parsedRows as unknown as BulkStudentRow[],
            dry_run: true,
          })
        : await bulkImportLecturers(token, {
            rows: parsedRows as unknown as BulkLecturerRow[],
            dry_run: true,
          });
      setPreview(res.data ?? null);
    } catch (err) {
      toast.error("Gagal preview", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCommit() {
    const token = getAccessToken();
    if (!token || parsedRows.length === 0) return;

    setIsLoading(true);
    try {
      const res = type === "student"
        ? await bulkImportStudents(token, {
            rows: parsedRows as unknown as BulkStudentRow[],
            dry_run: false,
          })
        : await bulkImportLecturers(token, {
            rows: parsedRows as unknown as BulkLecturerRow[],
            dry_run: false,
          });
      setPreview(res.data ?? null);
      setCommitted(true);
      toast.success(`Import ${label} selesai`, {
        description: `${res.data?.created ?? 0} dibuat, ${res.data?.updated ?? 0} diperbarui, ${res.data?.errors ?? 0} error.`,
      });
      onSuccess?.();
    } catch (err) {
      toast.error("Gagal import", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import {label}</DialogTitle>
          <DialogDescription>
            Upload file CSV dengan kolom:{" "}
            <code className="font-mono text-[11.5px]">{headers.join(", ")}</code>.
            Baris pertama harus header. Sistem akan preview hasilnya sebelum commit.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* File picker */}
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-background-alt">
              <Upload className="size-4" />
              {file ? file.name : "Pilih file CSV..."}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {parsedRows.length > 0 && (
              <span className="text-[12.5px] text-text-muted">
                {parsedRows.length} baris terdeteksi
              </span>
            )}
          </div>

          {parseError && (
            <p className="text-[12.5px] text-danger">{parseError}</p>
          )}

          {/* Preview results */}
          {preview && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 text-[12.5px]">
                <span className="text-success-text font-medium">
                  {preview.created} dibuat
                </span>
                <span className="text-info-text font-medium">
                  {preview.updated} diperbarui
                </span>
                {preview.errors > 0 && (
                  <span className="text-danger-text font-medium">
                    {preview.errors} error
                  </span>
                )}
              </div>

              <div className="max-h-64 overflow-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12">Baris</TableHead>
                      <TableHead>Identifier</TableHead>
                      <TableHead>Hasil</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.results?.map((r: BulkImportResultRow, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-[12px]">
                          {r.row_number}
                        </TableCell>
                        <TableCell className="text-[12.5px]">
                          {r.identifier || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={OUTCOME_VARIANT[r.outcome] ?? "neutral"}>
                            {r.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs text-[12px] text-danger-text">
                          {r.error || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isLoading}>
              {committed ? "Tutup" : "Batal"}
            </Button>
          </DialogClose>

          {!committed && (
            <>
              {!preview ? (
                <Button
                  onClick={handleDryRun}
                  loading={isLoading}
                  disabled={parsedRows.length === 0}
                >
                  <FileUp className="size-3.5" />
                  Preview
                </Button>
              ) : (
                <Button
                  onClick={handleCommit}
                  loading={isLoading}
                  disabled={preview.errors === preview.results?.length}
                >
                  <CheckCircle2 className="size-3.5" />
                  Commit Import
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseCSV(
  text: string,
  expectedHeaders: string[],
): { data: Record<string, string>[]; error?: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { data: [], error: "File harus memiliki minimal 1 header + 1 baris data." };
  }

  const headerLine = lines[0].toLowerCase();
  const headers = splitCSVLine(headerLine);

  // Validate that all expected headers exist (order doesn't matter).
  const missing = expectedHeaders.filter(
    (h) => !headers.includes(h.toLowerCase()),
  );
  // user_id is optional for import (can be derived from email lookup later)
  const requiredMissing = missing.filter((h) => h !== "user_id");
  if (requiredMissing.length > 0) {
    return {
      data: [],
      error: `Kolom wajib tidak ditemukan: ${requiredMissing.join(", ")}. Header yang terdeteksi: ${headers.join(", ")}`,
    };
  }

  const data: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    data.push(row);
  }

  return { data };
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
