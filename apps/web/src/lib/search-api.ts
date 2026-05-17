import { apiFetch } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";

export type SearchResultItem = {
  type: string;
  id: string;
  title: string;
  sub: string;
  href: string;
};

type RawRecord = Record<string, unknown>;

function getArray(obj: RawRecord, key: string) {
  const v = obj[key];
  return Array.isArray(v) ? v : [];
}

function getString(obj: RawRecord, key: string) {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

function normalize(raw: RawRecord): SearchResultItem {
  return {
    type: getString(raw, "type"),
    id: getString(raw, "id"),
    title: getString(raw, "title"),
    sub: getString(raw, "sub"),
    href: getString(raw, "href"),
  };
}

export async function globalSearch(token: string, query: string) {
  const response = await apiFetch<ApiResponse<RawRecord>>(
    `/api/v1/search?q=${encodeURIComponent(query)}`,
    { token },
  );
  const raw = getArray(response.data ?? {}, "items");
  return {
    ...response,
    data: { items: raw.map((it) => normalize(it as RawRecord)) },
  };
}
