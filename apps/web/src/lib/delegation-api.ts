import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-storage";

export type DelegationItem = {
  id: string;
  delegator_user_id: string;
  delegate_user_id: string;
  delegate_name: string;
  reason: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  revoked_at: string;
  created_at: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type ListDelegationsData = {
  delegations: DelegationItem[];
};

type DelegationResponseData = {
  delegation: DelegationItem;
};

type CheckDelegationData = {
  has_active_delegation: boolean;
  delegator_user_id: string;
  delegator_name: string;
  delegation: DelegationItem | null;
};

export async function listDelegations(includeExpired = false) {
  const params = includeExpired ? "?include_expired=true" : "";
  const res = await apiFetch<ApiResponse<ListDelegationsData>>(
    `/api/v1/head/delegations${params}`,
    { token: getAccessToken() },
  );
  return res.data?.delegations ?? [];
}

export async function createDelegation(payload: {
  delegate_user_id: string;
  delegate_name: string;
  reason: string;
  starts_at: string;
  ends_at: string;
}) {
  return apiFetch<ApiResponse<DelegationResponseData>>(
    "/api/v1/head/delegations/create",
    { method: "POST", token: getAccessToken(), body: payload },
  );
}

export async function revokeDelegation(id: string) {
  return apiFetch<ApiResponse<DelegationResponseData>>(
    "/api/v1/head/delegations/revoke",
    { method: "POST", token: getAccessToken(), body: { id } },
  );
}

export async function checkDelegation() {
  const res = await apiFetch<ApiResponse<CheckDelegationData>>(
    "/api/v1/head/delegations/check",
    { token: getAccessToken() },
  );
  return res.data;
}
