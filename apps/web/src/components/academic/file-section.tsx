"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FileItem,
  downloadFile,
  filePurposeLabel,
  formatFileSize,
  listAcademicRequestFiles,
  uploadFinalDocument,
  uploadSupportingDocument,
} from "@/lib/file-api";

type Props = {
  token: string;
  requestId: string;
  canUploadSupporting?: boolean;
  canUploadFinal?: boolean;
};

export function FileSection({
  token,
  requestId,
  canUploadSupporting = false,
  canUploadFinal = false,
}: Props) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const supportingInputRef = useRef<HTMLInputElement>(null);
  const finalInputRef = useRef<HTMLInputElement>(null);

  async function loadFiles() {
    setIsLoading(true);
    try {
      const res = await listAcademicRequestFiles(token, requestId);
      setFiles(res.data?.files ?? []);
    } catch (err) {
      toast.error("Gagal memuat daftar file", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
    type: "supporting" | "final",
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    setIsUploading(true);

    try {
      if (type === "supporting") {
        await uploadSupportingDocument(token, requestId, file);
        toast.success("Dokumen pendukung diupload", {
          description: file.name,
        });
      } else {
        await uploadFinalDocument(token, requestId, file);
        toast.success("Dokumen final diupload", { description: file.name });
      }
      await loadFiles();
    } catch (err) {
      toast.error("Upload gagal", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(file: FileItem) {
    setDownloadingId(file.id);
    try {
      await downloadFile(token, file.id, file.originalName);
    } catch (err) {
      toast.error("Download gagal", {
        description: err instanceof Error ? err.message : "Coba lagi",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  const supportingFiles = files.filter(
    (f) => f.purpose === "SUPPORTING_DOCUMENT",
  );
  const finalFiles = files.filter((f) => f.purpose === "FINAL_DOCUMENT");

  return (
    <div className="space-y-3">
      {/* Upload buttons */}
      {(canUploadSupporting || canUploadFinal) && (
        <div className="flex flex-wrap gap-2">
          {canUploadSupporting && (
            <>
              <input
                ref={supportingInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => handleUpload(e, "supporting")}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isUploading}
                onClick={() => supportingInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                Dokumen Pendukung
              </Button>
            </>
          )}

          {canUploadFinal && (
            <>
              <input
                ref={finalInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => handleUpload(e, "final")}
              />
              <Button
                type="button"
                size="sm"
                disabled={isUploading}
                onClick={() => finalInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                Dokumen Final
              </Button>
            </>
          )}
        </div>
      )}

      {/* File lists */}
      {isLoading ? (
        <p className="text-[12.5px] text-text-muted">Memuat file...</p>
      ) : files.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface-muted px-4 py-6 text-center">
          <p className="text-[12.5px] text-text-muted">Belum ada file.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {supportingFiles.length > 0 && (
            <FileGroup
              title="Dokumen Pendukung"
              files={supportingFiles}
              downloadingId={downloadingId}
              onDownload={handleDownload}
            />
          )}
          {finalFiles.length > 0 && (
            <FileGroup
              title="Dokumen Final"
              files={finalFiles}
              downloadingId={downloadingId}
              onDownload={handleDownload}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── FileGroup ───────────────────────────────────────────────────────────────

function FileGroup({
  title,
  files,
  downloadingId,
  onDownload,
}: {
  title: string;
  files: FileItem[];
  downloadingId: string | null;
  onDownload: (file: FileItem) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
        {title}
      </p>
      <ul className="space-y-1.5">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                <FileText className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-text-primary">
                  {file.originalName}
                </p>
                <p className="mt-0.5 text-[11.5px] text-text-muted">
                  {filePurposeLabel(file.purpose)}{" "}
                  <span className="text-text-disabled">·</span>{" "}
                  <span className="font-mono">
                    {formatFileSize(file.sizeBytes)}
                  </span>
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={downloadingId === file.id}
              onClick={() => onDownload(file)}
              className="shrink-0"
            >
              {downloadingId === file.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Unduh
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Re-export EmptyState for tree-shaking compatibility (so we can use it here if needed later)
export { EmptyState };
