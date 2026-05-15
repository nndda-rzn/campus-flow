import { apiFetch } from "@/lib/api";
import type { ApiResponse } from "@/types/auth";

export type AcademicServiceItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
};

export type AcademicRequest = {
  id: string;
  requestNumber: string;
  studentUserId: string;
  academicServiceId: string;
  serviceCode: string;
  serviceName: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ListAcademicServicesData = {
  services: AcademicServiceItem[];
};

export type AcademicRequestResponseData = {
  request: AcademicRequest;
};

export type ListAcademicRequestsData = {
  requests: AcademicRequest[];
};

export async function listAcademicServices(token: string) {
  return apiFetch<ApiResponse<ListAcademicServicesData>>(
    "/api/v1/academic-services",
    {
      token,
    },
  );
}

export async function listMyAcademicRequests(token: string) {
  return apiFetch<ApiResponse<ListAcademicRequestsData>>(
    "/api/v1/student/academic-requests",
    {
      token,
    },
  );
}

export async function createAcademicRequest(
  token: string,
  payload: {
    service_code: string;
    title: string;
    description: string;
  },
) {
  return apiFetch<ApiResponse<AcademicRequestResponseData>>(
    "/api/v1/student/academic-requests",
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}
