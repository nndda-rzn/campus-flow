import { apiFetch } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FileItem = {
  id: string;
  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  ownerType: string;
  ownerId: string;
  purpose: string;
  createdAt: string;
};

export type ListFilesData = {
  files: FileItem[];
};

export type FileResponseData = {
  file: FileItem;
};

// ─── Normalizer ───────────────────────────────────────────────────────────────

type RawFile = Record<string, unknown>;

function normalizeFileItem(raw: RawFile): FileItem {
  const str = (key: string, fallback = "") => {
    const v = raw[key];
    return typeof v === "string" ? v : fallback;
  };
  const num = (key: string) => {
    const v = raw[key];
    return typeof v === "number" ? v : 0;
  };

  return {
    id: str("id"),
    originalName: str("originalName") || str("original_name"),
    storedName: str("storedName") || str("stored_name"),
    storagePath: str("storagePath") || str("storage_path"),
    mimeType: str("mimeType") || str("mime_type"),
    sizeBytes: num("sizeBytes") || num("size_bytes"),
    uploadedByUserId: str("uploadedByUserId") || str("uploaded_by_user_id"),
    ownerType: str("ownerType") || str("owner_type"),
    ownerId: str("ownerId") || str("owner_id"),
    purpose: str("purpose"),
    createdAt: str("createdAt") || str("created_at"),
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * List semua file milik satu academic request.
 */
export async function listAcademicRequestFiles(
  token: string,
  requestId: string,
) {
  const response = await apiFetch<ApiResponse<Record<string, unknown>>>(
    `/api/v1/academic-requests/files?request_id=${encodeURIComponent(requestId)}`,
    { token },
  );

  const rawFiles = response.data?.files;
  const files = Array.isArray(rawFiles)
    ? rawFiles.map((f) => normalizeFileItem(f as RawFile))
    : [];

  return { ...response, data: { files } };
}

/**
 * Upload dokumen pendukung (MAHASISWA).
 * Menggunakan fetch langsung karena multipart/form-data.
 */
export async function uploadSupportingDocument(
  token: string,
  requestId: string,
  file: File,
): Promise<ApiResponse<FileResponseData>> {
  const formData = new FormData();
  formData.append("request_id", requestId);
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/student/academic-requests/upload-supporting-document`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ?? `Upload gagal dengan status ${response.status}`,
    );
  }

  return data as ApiResponse<FileResponseData>;
}

/**
 * Upload dokumen final (TATA_USAHA / SUPER_ADMIN).
 * Menggunakan fetch langsung karena multipart/form-data.
 */
export async function uploadFinalDocument(
  token: string,
  requestId: string,
  file: File,
): Promise<ApiResponse<FileResponseData>> {
  const formData = new FormData();
  formData.append("request_id", requestId);
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/staff/academic-requests/upload-final-document`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ?? `Upload gagal dengan status ${response.status}`,
    );
  }

  return data as ApiResponse<FileResponseData>;
}

/**
 * Download file — mengembalikan URL object blob agar bisa di-trigger sebagai
 * anchor download tanpa membuka tab baru.
 */
export async function downloadFile(
  token: string,
  fileId: string,
  fileName: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/files/download?file_id=${encodeURIComponent(fileId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      data?.message ?? `Download gagal dengan status ${response.status}`,
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Bebaskan memory setelah download
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Format ukuran file ke string yang mudah dibaca.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Label purpose file yang lebih ramah.
 */
export function filePurposeLabel(purpose: string): string {
  switch (purpose) {
    case "SUPPORTING_DOCUMENT":
      return "Dokumen Pendukung";
    case "FINAL_DOCUMENT":
      return "Dokumen Final";
    default:
      return purpose;
  }
}
