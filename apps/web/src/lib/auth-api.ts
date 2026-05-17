import { apiFetch } from "@/lib/api";
import type { ApiResponse, LoginResponseData, UserRole } from "@/types/auth";

export type LoginPayload = {
  email: string;
  password: string;
};

type RawLoginData = {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  user?: {
    userId?: string;
    user_id?: string;
    fullName?: string;
    full_name?: string;
    email?: string;
    role?: UserRole;
  };
};

export async function login(payload: LoginPayload) {
  const response = await apiFetch<ApiResponse<RawLoginData>>(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: payload,
    },
  );

  if (!response.data) {
    return response as ApiResponse<LoginResponseData>;
  }

  const raw = response.data;

  const normalized: LoginResponseData = {
    accessToken: raw.accessToken ?? raw.access_token ?? "",
    refreshToken: raw.refreshToken ?? raw.refresh_token ?? "",
    user: {
      userId: raw.user?.userId ?? raw.user?.user_id ?? "",
      fullName: raw.user?.fullName ?? raw.user?.full_name ?? "",
      email: raw.user?.email ?? "",
      role: raw.user?.role ?? "MAHASISWA",
    },
  };

  return {
    ...response,
    data: normalized,
  };
}

export async function getMe(token: string) {
  return apiFetch<
    ApiResponse<{
      user_id: string;
      role: string;
    }>
  >("/api/v1/me", {
    method: "GET",
    token,
  });
}

export async function changePassword(
  token: string,
  payload: { current_password: string; new_password: string },
) {
  return apiFetch<ApiResponse<null>>("/api/v1/me/change-password", {
    method: "POST",
    token,
    body: payload,
  });
}
