"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
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
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const supportingInputRef = useRef<HTMLInputElement>(null);
  const finalInputRef = useRef<HTMLInputElement>(null);

  async function loadFiles() {
    setIsLoading(true);
    setError("");
    try {
      const res = await listAcademicRequestFiles(token, requestId);
      setFiles(res.data?.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar file");
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
    setError("");
    setSuccessMsg("");

    try {
      if (type === "supporting") {
        await uploadSupportingDocument(token, requestId, file);
        setSuccessMsg("Dokumen pendukung berhasil diupload.");
      } else {
        await uploadFinalDocument(token, requestId, file);
        setSuccessMsg("Dokumen final berhasil diupload.");
      }
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengupload file");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(file: FileItem) {
    setDownloadingId(file.id);
    setError("");
    try {
      await downloadFile(token, file.id, file.originalName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mendownload file");
    } finally {
      setDownloadingId(null);
    }
  }

  const supportingFiles = files.filter(
    (f) => f.purpose === "SUPPORTING_DOCUMENT",
  );
  const finalFiles = files.filter((f) => f.purpose === "FINAL_DOCUMENT");

  return (
    <div className="space-y-4">
      {successMsg ? (
        <div className="alert alert-success">{successMsg}</div>
      ) : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

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
              <button
                type="button"
                disabled={isUploading}
                onClick={() => supportingInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
              >
                <IconUpload />
                {isUploading ? "Mengupload..." : "Dokumen Pendukung"}
              </button>
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
              <button
                type="button"
                disabled={isUploading}
                onClick={() => finalInputRef.current?.click()}
                className="btn btn-primary btn-sm"
              >
                <IconUpload />
                {isUploading ? "Mengupload..." : "Dokumen Final"}
              </button>
            </>
          )}
        </div>
      )}

      {/* File lists */}
      {isLoading ? (
        <p className="text-sm text-text-muted">Memuat file...</p>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-muted px-4 py-8 text-center">
          <p className="text-sm text-text-muted">Belum ada file.</p>
        </div>
      ) : (
        <div className="space-y-4">
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

type FileGroupProps = {
  title: string;
  files: FileItem[];
  downloadingId: string | null;
  onDownload: (file: FileItem) => void;
};

function FileGroup({
  title,
  files,
  downloadingId,
  onDownload,
}: FileGroupProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </p>
      <ul className="space-y-2">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                <IconFile />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {file.originalName}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {filePurposeLabel(file.purpose)} ·{" "}
                  {formatFileSize(file.sizeBytes)}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={downloadingId === file.id}
              onClick={() => onDownload(file)}
              className="btn btn-secondary btn-sm shrink-0"
            >
              {downloadingId === file.id ? "..." : "Unduh"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconUpload() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
