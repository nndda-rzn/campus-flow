import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-storage";

export type NoteTemplate = {
  id: string;
  department_id: string;
  category: string;
  title: string;
  body: string;
  usage_count: number;
  is_active: boolean;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

type NoteTemplateListResponse = {
  success: boolean;
  message: string;
  data: {
    templates: NoteTemplate[];
  };
};

type NoteTemplateResponse = {
  success: boolean;
  message: string;
  data: {
    template: NoteTemplate;
  };
};

export async function listNoteTemplates(
  category?: string,
  departmentId?: string,
): Promise<NoteTemplate[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (departmentId) params.set("department_id", departmentId);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await apiFetch<NoteTemplateListResponse>(
    `/api/v1/admin/note-templates${query}`,
    { token: getAccessToken() },
  );
  return res.data?.templates ?? [];
}

export async function createNoteTemplate(payload: {
  department_id?: string;
  category: string;
  title: string;
  body: string;
}): Promise<NoteTemplate> {
  const res = await apiFetch<NoteTemplateResponse>(
    "/api/v1/admin/note-templates/create",
    {
      method: "POST",
      body: payload,
      token: getAccessToken(),
    },
  );
  return res.data.template;
}

export async function updateNoteTemplate(payload: {
  id: string;
  title: string;
  body: string;
  category: string;
}): Promise<NoteTemplate> {
  const res = await apiFetch<NoteTemplateResponse>(
    "/api/v1/admin/note-templates/update",
    {
      method: "POST",
      body: payload,
      token: getAccessToken(),
    },
  );
  return res.data.template;
}

export async function deleteNoteTemplate(id: string): Promise<void> {
  await apiFetch("/api/v1/admin/note-templates/delete", {
    method: "POST",
    body: { id },
    token: getAccessToken(),
  });
}

export async function incrementTemplateUsage(id: string): Promise<void> {
  await apiFetch("/api/v1/admin/note-templates/increment-usage", {
    method: "POST",
    body: { id },
    token: getAccessToken(),
  });
}
