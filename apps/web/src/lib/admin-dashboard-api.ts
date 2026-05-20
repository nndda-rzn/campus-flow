import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-storage";

export type DailyCount = {
  date: string;
  count: number;
};

export type AdminOperationalDashboard = {
  pending_verification_count: number;
  sla_at_risk_count: number;
  sla_breached_count: number;
  avg_verification_time_hours: number;
  weekly_throughput: number;
  requests_by_day: DailyCount[];
};

export type SLAAtRiskItem = {
  request_id: string;
  request_number: string;
  title: string;
  student_user_id: string;
  status: string;
  due_at: string;
  created_at: string;
  hours_remaining: number;
};

type DashboardResponse = {
  success: boolean;
  message: string;
  data: AdminOperationalDashboard;
};

type SLAAtRiskResponse = {
  success: boolean;
  message: string;
  data: {
    items: SLAAtRiskItem[];
  };
};

export async function getAdminOperationalDashboard(): Promise<AdminOperationalDashboard> {
  const res = await apiFetch<DashboardResponse>(
    "/api/v1/reports/admin-dashboard",
    { token: getAccessToken() },
  );
  return res.data;
}

export async function getSLAAtRiskRequests(limit = 5): Promise<SLAAtRiskItem[]> {
  const res = await apiFetch<SLAAtRiskResponse>(
    `/api/v1/reports/sla-at-risk?limit=${limit}`,
    { token: getAccessToken() },
  );
  return res.data?.items ?? [];
}
