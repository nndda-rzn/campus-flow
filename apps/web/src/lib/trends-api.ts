import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-storage";

export type TrendDataPoint = {
  period: string;
  submitted_count: number;
  verified_count: number;
  approved_count: number;
  completed_count: number;
  rejected_count: number;
};

export type ProcessingTimeReport = {
  avg_submission_to_verification_hours: number;
  avg_verification_to_approval_hours: number;
  avg_approval_to_completion_hours: number;
  avg_total_processing_hours: number;
  p90_total_hours: number;
};

type TrendsResponse = {
  success: boolean;
  message: string;
  data: {
    data_points: TrendDataPoint[];
  };
};

type ProcessingTimeResponse = {
  success: boolean;
  message: string;
  data: ProcessingTimeReport;
};

export async function getRequestTrends(params: {
  start_date?: string;
  end_date?: string;
  granularity?: string;
}): Promise<TrendDataPoint[]> {
  const query = new URLSearchParams();
  if (params.start_date) query.set("start_date", params.start_date);
  if (params.end_date) query.set("end_date", params.end_date);
  if (params.granularity) query.set("granularity", params.granularity);

  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await apiFetch<TrendsResponse>(
    `/api/v1/reports/trends${qs}`,
    { token: getAccessToken() },
  );
  return res.data?.data_points ?? [];
}

export async function getProcessingTimeReport(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<ProcessingTimeReport> {
  const query = new URLSearchParams();
  if (params?.start_date) query.set("start_date", params.start_date);
  if (params?.end_date) query.set("end_date", params.end_date);

  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await apiFetch<ProcessingTimeResponse>(
    `/api/v1/reports/processing-time${qs}`,
    { token: getAccessToken() },
  );
  return res.data;
}
