"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { api } from "@/lib/api";

type DashboardResponse = {
  jobs?: {
    jobs?: { pending?: number };
    pendingJobs?: unknown[];
  };
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingJobs, setPendingJobs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadBadge() {
      try {
        const response = await api.get<DashboardResponse>("/dashboard");
        if (cancelled) return;
        const pending =
          response.data.jobs?.jobs?.pending ??
          response.data.jobs?.pendingJobs?.length ??
          0;
        setPendingJobs(Number(pending) || 0);
      } catch {
        // shell vẫn render khi badge lỗi
      }
    }
    void loadBadge();
    return () => {
      cancelled = true;
    };
  }, []);

  return <AdminShell pendingJobs={pendingJobs}>{children}</AdminShell>;
}
