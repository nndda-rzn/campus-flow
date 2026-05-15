import { apiFetch } from "@/lib/api";
import type { ApiResponse, LoginResponseData } from "@/types/auth";

export type LoginPayload = {
  email: string;
  password: string;
};

export async function login(payload: LoginPayload) {
  return apiFetch<ApiResponse<LoginResponseData>>("/api/v1/auth/login", {
    method: "POST",
    body: payload,
  });
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
