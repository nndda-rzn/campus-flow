import type { UserRole } from "@/types/auth";

export function getDashboardPathByRole(role: UserRole) {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "ADMIN_PRODI":
      return "/admin";
    case "MAHASISWA":
      return "/student";
    case "DOSEN":
      return "/lecturer";
    case "KAPRODI":
      return "/head";
    case "TATA_USAHA":
      return "/staff";
    default:
      return "/dashboard";
  }
}
