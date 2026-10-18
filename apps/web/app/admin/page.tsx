"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Download,
  RefreshCw,
  Shield,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { companyInitials, logoColor } from "@/lib/format";

type DashboardResponse = {
  accounts: {
    recruiters?: {
      total: number;
      pending: number;
      verified: number;
      suspended: number;
    };
    pendingCompanies?: Array<{
      id: string;
      fullName: string;
      email: string;
      verificationStatus: string | null;
      company: {
        id: string;
        name: string;
        industry: string | null;
        location: string | null;
      } | null;
    }>;
  };
  jobs: {
    total?: number;
    jobs?: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      closed: number;
    };
    pendingJobs?: Array<{
      id: string;
      title: string;
      location: string;
      createdAt: string;
      company: { id: string; name: string } | null;
    }>;
  };
};

function StatBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "orange" | "green" | "red" | "blue" | "gray";
}) {
  const tones = {
    orange: "bg-[#FFF4E5] text-[#B54708]",
    green: "bg-[#E6F7F2] text-[#006A61]",
    red: "bg-[#FDECEC] text-[#B42318]",
    blue: "bg-[#EFF4FF] text-[#003C90]",
    gray: "bg-[#F1F3F7] text-[#44506A]",
  };
  return (
    <div className={`rounded-xl px-3 py-3 ${tones[tone]}`}>
      <p className="text-[11px] font-semibold opacity-80">{label}</p>
      <p className="mt-1 text-xl font-bold">{value.toLocaleString("vi-VN")}</p>
    </div>
  );
}

export default function AdminHomePage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await api.get<DashboardResponse>("/dashboard");
      setData(response.data);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const recruiters = data?.accounts?.recruiters ?? {
    total: 0,
    pending: 0,
    verified: 0,
    suspended: 0,
  };
  const jobs = data?.jobs?.jobs ?? {
    total: data?.jobs?.total ?? 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    closed: 0,
  };
  const pendingJobs = data?.jobs?.pendingJobs ?? [];
  const pendingCompanies = data?.accounts?.pendingCompanies ?? [];

  function exportReport() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `admin-overview-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1C30] sm:text-[28px]">
            Tổng quan giám sát thời gian thực
          </h1>
          <p className="mt-1 text-sm text-[#68758B]">
            Theo dõi recruiter, tin tuyển dụng và hàng chờ kiểm duyệt.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportReport}
            disabled={!data}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#DCE9FF] bg-white px-3 text-xs font-semibold text-[#003C90] disabled:opacity-50"
          >
            <Download size={14} /> Xuất báo cáo
          </button>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#003C90] px-3 text-xs font-semibold text-white disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin" : undefined}
            />
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-10 text-sm text-[#68758B]">Đang tải tổng quan...</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF4FF] text-[#003C90]">
                  <Building2 size={16} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8793a6]">
                    Khối nhà tuyển dụng
                  </p>
                  <p className="text-sm font-semibold text-[#0B1C30]">
                    Recruiter &amp; Doanh nghiệp
                  </p>
                </div>
              </div>
              <p className="mt-5 text-3xl font-bold text-[#003C90]">
                {recruiters.total.toLocaleString("vi-VN")}
              </p>
              <p className="mt-1 text-xs text-[#68758B]">Tổng Recruiter</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <StatBadge
                  label="Chờ xác minh"
                  value={recruiters.pending}
                  tone="orange"
                />
                <StatBadge
                  label="Đã xác minh"
                  value={recruiters.verified}
                  tone="green"
                />
                <StatBadge
                  label="Đình chỉ"
                  value={recruiters.suspended}
                  tone="red"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF4FF] text-[#003C90]">
                  <BriefcaseBusiness size={16} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8793a6]">
                    Khối tin tuyển dụng
                  </p>
                  <p className="text-sm font-semibold text-[#0B1C30]">
                    Kiểm duyệt &amp; Hiển thị
                  </p>
                </div>
              </div>
              <p className="mt-5 text-3xl font-bold text-[#003C90]">
                {jobs.total.toLocaleString("vi-VN")}
              </p>
              <p className="mt-1 text-xs text-[#68758B]">Tổng tin đăng</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <StatBadge
                  label="Chờ duyệt gấp"
                  value={jobs.pending}
                  tone="blue"
                />
                <StatBadge
                  label="Đã phê duyệt"
                  value={jobs.approved}
                  tone="green"
                />
                <StatBadge
                  label="Bị từ chối"
                  value={jobs.rejected}
                  tone="gray"
                />
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#003C90]">
                    <BriefcaseBusiness size={15} />
                  </span>
                  <h2 className="text-sm font-bold text-[#0B1C30]">
                    Tin tuyển dụng chờ kiểm duyệt
                  </h2>
                </div>
                <Link
                  href="/admin/jobs"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F52BA]"
                >
                  Chi tiết <ArrowRight size={12} />
                </Link>
              </div>
              <ul className="space-y-2">
                {pendingJobs.slice(0, 4).map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center gap-3 rounded-xl border border-[#E4EAF3] bg-[#F8F9FF] px-3 py-2.5"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${logoColor(job.company?.name || job.title)}`}
                    >
                      {companyInitials(job.company?.name || job.title)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0B1C30]">
                        {job.title}
                      </p>
                      <p className="truncate text-[11px] text-[#68758B]">
                        {job.company?.name || "Doanh nghiệp"} · {job.location}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#003C90]">
                      Pending
                    </span>
                  </li>
                ))}
                {pendingJobs.length === 0 && (
                  <li className="rounded-xl border border-dashed border-[#E4EAF3] px-4 py-8 text-center text-sm text-[#8793a6]">
                    Không có tin chờ duyệt.
                  </li>
                )}
              </ul>
            </section>

            <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF4E5] text-[#B54708]">
                    <Shield size={15} />
                  </span>
                  <h2 className="text-sm font-bold text-[#0B1C30]">
                    Xác minh hồ sơ doanh nghiệp
                  </h2>
                </div>
                <Link
                  href="/admin/recruiters"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F52BA]"
                >
                  Chi tiết <ArrowRight size={12} />
                </Link>
              </div>
              <ul className="space-y-2">
                {pendingCompanies.slice(0, 4).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-[#E4EAF3] bg-[#F8F9FF] px-3 py-2.5"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${logoColor(item.company?.name || item.fullName)}`}
                    >
                      {companyInitials(item.company?.name || item.fullName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0B1C30]">
                        {item.company?.name || item.fullName}
                      </p>
                      <p className="truncate text-[11px] text-[#68758B]">
                        {item.company?.industry || "Doanh nghiệp"} ·{" "}
                        {item.fullName}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B54708]">
                      Pending_verif
                    </span>
                  </li>
                ))}
                {pendingCompanies.length === 0 && (
                  <li className="rounded-xl border border-dashed border-[#E4EAF3] px-4 py-8 text-center text-sm text-[#8793a6]">
                    Không có hồ sơ chờ xác minh.
                  </li>
                )}
              </ul>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
