const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

/**
 * Coba refresh access token menggunakan refresh token yang tersimpan.
 * Mengembalikan access token baru jika berhasil, null jika gagal.
 */
async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("campusflow_refresh_token");
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json().catch(() => null);
    const newAccessToken =
      data?.data?.accessToken ?? data?.data?.access_token ?? null;

    if (!newAccessToken) return null;

    // Simpan access token baru ke localStorage
    localStorage.setItem("campusflow_access_token", newAccessToken);
    return newAccessToken;
  } catch {
    return null;
  }
}

/**
 * Bersihkan sesi dan redirect ke halaman login.
 */
function clearSessionAndRedirect() {
  localStorage.removeItem("campusflow_access_token");
  localStorage.removeItem("campusflow_refresh_token");
  localStorage.removeItem("campusflow_user");
  window.location.replace("/login");
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Jika 401, coba refresh token lalu ulangi request
  if (response.status === 401 && options.token) {
    const newToken = await tryRefreshToken();

    if (!newToken) {
      // Refresh gagal — sesi tidak valid, redirect ke login
      clearSessionAndRedirect();
      throw new Error("Sesi habis. Silakan login ulang.");
    }

    // Ulangi request dengan token baru
    const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newToken}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const retryData = await retryResponse.json().catch(() => null);

    if (!retryResponse.ok) {
      if (retryResponse.status === 401) {
        // Masih 401 setelah refresh — paksa logout
        clearSessionAndRedirect();
        throw new Error("Sesi habis. Silakan login ulang.");
      }
      const message =
        retryData?.message ??
        `Request gagal dengan status ${retryResponse.status}`;
      throw new Error(message);
    }

    return retryData as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.message ?? `Request gagal dengan status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}
