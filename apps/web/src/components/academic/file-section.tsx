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
  /** Apakah user boleh upload dokumen pendukung (MAHASISWA) */
  canUploadSupporting?: boolean;
  /** Apakah user boleh upload dokumen final (TATA_USAHA / SUPER_ADMIN) */
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

    // Reset input agar file yang sama bisa dipilih ulang
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
    <div className="space-y-5">
      {/* Pesan sukses / error */}
      {successMsg ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Tombol upload */}
      {(canUploadSupporting || canUploadFinal) && (
        <div className="flex flex-wrap gap-3">
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
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {isUploading ? "Mengupload..." : "Upload Dokumen Pendukung"}
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
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {isUploading ? "Mengupload..." : "Upload Dokumen Final"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Daftar file */}
      {isLoading ? (
        <p className="text-sm text-slate-500">Memuat file...</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada file yang diupload.</p>
      ) : (
        <div className="space-y-4">
          {/* Dokumen Pendukung */}
          {supportingFiles.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Dokumen Pendukung
              </p>
              <ul className="space-y-2">
                {supportingFiles.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    isDownloading={downloadingId === file.id}
                    onDownload={() => handleDownload(file)}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Dokumen Final */}
          {finalFiles.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Dokumen Final
              </p>
              <ul className="space-y-2">
                {finalFiles.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    isDownloading={downloadingId === file.id}
                    onDownload={() => handleDownload(file)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FileRow ──────────────────────────────────────────────────────────────────

type FileRowProps = {
  file: FileItem;
  isDownloading: boolean;
  onDownload: () => void;
};

function FileRow({ file, isDownloading, onDownload }: FileRowProps) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">
          {file.originalName}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {filePurposeLabel(file.purpose)} · {formatFileSize(file.sizeBytes)}
        </p>
      </div>

      <button
        type="button"
        disabled={isDownloading}
        onClick={onDownload}
        className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {isDownloading ? "Mengunduh..." : "Unduh"}
      </button>
    </li>
  );
}
