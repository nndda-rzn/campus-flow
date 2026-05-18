import { apiFetch } from "./api";
import type { ApiResponse } from "@/types/auth";

export type FAQCategoryItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  sequenceOrder: number;
  isActive: boolean;
  createdAt: string;
};

export type FAQItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  question: string;
  answer: string;
  sequenceOrder: number;
  isActive: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
};

export async function getFAQCategories(token: string) {
  return apiFetch<ApiResponse<{ items: FAQCategoryItem[] }>>("/api/v1/faq-categories", { token });
}

export async function getFAQs(token: string, categoryId?: string) {
  const query = new URLSearchParams();
  if (categoryId) query.append("category_id", categoryId);

  const qs = query.toString();
  const url = `/api/v1/faqs${qs ? `?${qs}` : ""}`;
  
  return apiFetch<ApiResponse<{ items: FAQItem[] }>>(url, { token });
}
