"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";

type Company = {
  id: string;
  name: string;
  industry: string | null;
  location: string | null;
  taxCode: string | null;
  website: string | null;
  description: string | null;
};

export default function RecruiterCompanyPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await api.get<Company>("/companies/me");
        if (!cancelled) setCompany(response.data);
      } catch (requestError) {
        if (!cancelled) setError(formatApiError(requestError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[#0B1C30]">Hồ sơ công ty</h1>
      <p className="mt-1 text-sm text-[#68758B]">
        Thông tin doanh nghiệp hiển thị trên TalentHub.
      </p>
      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p className="mt-8 text-sm text-[#68758B]">Đang tải...</p>
      ) : company ? (
        <div className="mt-6 rounded-2xl border border-[#E4EAF3] bg-white p-5">
          <p className="text-lg font-bold text-[#0B1C30]">{company.name}</p>
          <p className="mt-2 text-sm text-[#68758B]">
            {company.industry || "—"} · {company.location || "—"}
          </p>
          <p className="mt-2 text-xs text-[#8793a6]">
            MST: {company.taxCode || "—"}
          </p>
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-xs font-semibold text-[#0F52BA]"
            >
              {company.website}
            </a>
          )}
          {company.description && (
            <p className="mt-4 text-sm leading-relaxed text-[#44506A]">
              {company.description}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-[#E4EAF3] bg-white px-4 py-10 text-center text-sm text-[#8793a6]">
          Chưa có hồ sơ công ty. Hoàn tất tại{" "}
          <Link
            href="/register/recruiter"
            className="font-semibold text-[#0F52BA]"
          >
            đăng ký recruiter
          </Link>
          .
        </p>
      )}
    </main>
  );
}
