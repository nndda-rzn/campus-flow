import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-storage";

export type ThesisOverviewItem = {
  student_user_id: string;
  student_name: string;
  nim: string;
  topic_title: string;
  lecturer_name: string;
  current_milestone: string;
  completion_percentage: number;
  days_since_last_activity: number;
  is_stuck: boolean;
  supervisor_request_id: string;
};

export type ThesisOverviewData = {
  students: ThesisOverviewItem[];
  total: number;
  on_track: number;
  behind: number;
  not_started: number;
};

type ThesisOverviewResponse = {
  success: boolean;
  message: string;
  data: ThesisOverviewData;
};

export async function getThesisOverview(params?: {
  department_id?: string;
  stuck_only?: boolean;
  search?: string;
}): Promise<ThesisOverviewData> {
  const query = new URLSearchParams();
  if (params?.department_id) query.set("department_id", params.department_id);
  if (params?.stuck_only) query.set("stuck_only", "true");
  if (params?.search) query.set("search", params.search);

  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await apiFetch<ThesisOverviewResponse>(
    `/api/v1/admin/thesis-overview${qs}`,
    { token: getAccessToken() },
  );
  return res.data;
}
