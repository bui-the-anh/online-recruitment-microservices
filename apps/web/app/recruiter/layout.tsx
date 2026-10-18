"use client";

import { useEffect, useState } from "react";
import { RecruiterShell } from "@/components/recruiter/recruiter-shell";
import { api } from "@/lib/api";

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await api
          .get<Array<{ readAt: string | null }>>("/notifications")
          .catch(() => null);
        if (!cancelled && response) {
          setUnread(response.data.filter((item) => !item.readAt).length);
        }
      } catch {
        // ignore
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return <RecruiterShell unread={unread}>{children}</RecruiterShell>;
}
