"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-storage";
import { getDashboardPathByRole } from "@/lib/role-redirect";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    router.replace(getDashboardPathByRole(user.role));
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Mengarahkan dashboard...</p>
    </main>
  );
}
