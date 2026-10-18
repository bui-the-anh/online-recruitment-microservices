"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  FileText,
  FolderOpen,
  MapPin,
  Pencil,
  Plus,
  Video,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import {
  companyInitials,
  daysUntil,
  formatSalaryRange,
  logoColor,
  workModeLabel,
} from "@/lib/format";

type DashboardResponse = {
  jobs: {
    total?: number;
    jobs?: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      closed: number;
    };
    attentionJobs?: Array<{
      id: string;
      title: string;
      location: string;
      workMode: string;
      status: string;
      salaryMin: number | null;
      salaryMax: number | null;
      currency: string;
      expiresAt: string | null;
      rejectionNote: string | null;
      applicants: number;
    }>;
    company?: {
      id: string;
      name: string;
      taxCode: string | null;
      industry: string | null;
    } | null;
  };
  applications: {
    total?: number;
    stats?: {
      newApplications: number;
      interviewsThisWeek: number;
      unviewed: number;
      responseRate: number;
    };
    recentApplications?: Array<{
      id: string;
      status: string;
      cvUrl: string;
      createdAt: string;
      job: { id: string; title: string };
      candidate: { id: string; fullName: string; email: string };
    }>;
    upcomingInterviews?: Array<{
      id: string;
      interviewScheduledAt: string | null;
      interviewDetails: string | null;
      job: { id: string; title: string };
      candidate: { id: string; fullName: string; email: string };
    }>;
  };
};

type AuthMe = {
  fullName: string;
  verificationStatus?: string | null;
};

function jobStatusBadge(status: string) {
  if (status === "APPROVED") {
    return (
      <span className="rounded-full bg-[#E6F7F2] px-2 py-0.5 text-[10px] font-bold text-[#006A61]">
        Đã duyệt
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className="rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-bold text-[#B54708]">
        Chờ duyệt
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="rounded-full bg-[#FDECEC] px-2 py-0.5 text-[10px] font-bold text-[#B42318]">
        Bị từ chối
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[#F1F3F7] px-2 py-0.5 text-[10px] font-bold text-[#68758B]">
      Đã đóng
    </span>
  );
}

function relativeApplied(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.max(0, Math.floor(diff / 3600000));
  if (hours < 1) return "Vừa nộp";
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function interviewSlot(value: string | null): string {
  if (!value) return "Chưa xếp lịch";
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const time = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const end = new Date(date.getTime() + 60 * 60 * 1000).toLocaleTimeString(
    "vi-VN",
    { hour: "2-digit", minute: "2-digit" },
  );
  const sameDay =
    date.toDateString() === today.toDateString()
      ? "Hôm nay"
      : date.toDateString() === tomorrow.toDateString()
        ? "Ngày mai"
        : date.toLocaleDateString("vi-VN");
  return `${time} - ${end} · ${sameDay}`;
}

export default function RecruiterDashboardPage() {
  const [me, setMe] = useState<AuthMe | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [meRes, dashRes] = await Promise.all([
        api.get<AuthMe>("/auth/me"),
        api.get<DashboardResponse>("/dashboard"),
      ]);
      setMe(meRes.data);
      setData(dashRes.data);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const jobsTotal = data?.jobs?.jobs?.total ?? data?.jobs?.total ?? 0;
  const stats = data?.applications?.stats ?? {
    newApplications: 0,
    interviewsThisWeek: 0,
    unviewed: 0,
    responseRate: 0,
  };
  const company = data?.jobs?.company;
  const attentionJobs = data?.jobs?.attentionJobs ?? [];
  const recentApps = data?.applications?.recentApplications ?? [];
  const interviews = data?.applications?.upcomingInterviews ?? [];
  const verified = me?.verificationStatus === "VERIFIED";

  if (loading) {
    return (
      <p className="px-4 py-16 text-center text-sm text-[#68758B]">
        Đang tải bảng điều khiển...
      </p>
    );
  }

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-bold text-white ${logoColor(company?.name || me?.fullName || "DN")}`}
          >
            {companyInitials(company?.name || me?.fullName || "DN")}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-[#0B1C30] sm:text-2xl">
              Chào mừng trở lại, {me?.fullName || "Recruiter"}!
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[#0F52BA]">
                {company?.name || "Hồ sơ công ty chưa tạo"}
              </p>
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[10px] font-bold text-[#003C90]">
                  <BadgeCheck size={11} /> Đã xác thực
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#68758B]">
              Mã số thuế: {company?.taxCode || "—"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E4EAF3] bg-white px-3 text-xs font-semibold text-[#44506A]"
            >
              <BarChart3 size={14} /> Báo cáo tuần
            </button>
            <Link
              href="/recruiter/jobs"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#003C90] px-3 text-xs font-semibold text-white"
            >
              <Plus size={14} /> Tạo tin tuyển dụng mới
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tổng tin tuyển dụng",
            value: jobsTotal,
            icon: BriefcaseBusiness,
            tone: "bg-[#EFF4FF] text-[#003C90]",
          },
          {
            label: "Hồ sơ ứng tuyển mới",
            value: stats.newApplications,
            icon: FolderOpen,
            tone: "bg-[#EFF4FF] text-[#003C90]",
          },
          {
            label: "Phỏng vấn tuần này",
            value: stats.interviewsThisWeek,
            icon: Video,
            tone: "bg-[#EFF4FF] text-[#003C90]",
          },
          {
            label: "Tỷ lệ phản hồi hồ sơ",
            value: `${stats.responseRate}%`,
            icon: Clock3,
            tone: "bg-[#E6F7F2] text-[#006A61]",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-[#E4EAF3] bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#68758B]">
                  {card.label}
                </p>
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${card.tone}`}
                >
                  <Icon size={16} />
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-[#0B1C30]">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-[#0B1C30]">
                Tin tuyển dụng cần chú ý
              </h2>
              <Link
                href="/recruiter/jobs"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F52BA]"
              >
                Xem tất cả ({jobsTotal}) <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-3">
              {attentionJobs.map((job) => {
                const days = daysUntil(job.expiresAt);
                return (
                  <article
                    key={job.id}
                    className="rounded-xl border border-[#E4EAF3] bg-[#F8F9FF] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-[#0B1C30]">
                            {job.title}
                          </p>
                          {jobStatusBadge(job.status)}
                        </div>
                        {job.status === "PENDING" && (
                          <p className="mt-1 text-[11px] text-[#B54708]">
                            Chờ Admin duyệt nội dung (BR-R06)
                          </p>
                        )}
                        {job.status === "REJECTED" && job.rejectionNote && (
                          <p className="mt-1 text-[11px] text-[#B42318]">
                            Phản hồi kiểm duyệt: &ldquo;{job.rejectionNote}
                            &rdquo;
                          </p>
                        )}
                        {job.status === "APPROVED" && (
                          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#68758B]">
                            <span>
                              {formatSalaryRange(
                                job.salaryMin,
                                job.salaryMax,
                                job.currency,
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={11} /> {job.location} (
                              {workModeLabel(job.workMode)})
                            </span>
                            {days != null && (
                              <span>
                                Còn {Math.max(0, days)} ngày
                              </span>
                            )}
                            <span>{job.applicants} ứng viên</span>
                          </p>
                        )}
                      </div>
                      {job.status === "PENDING" && (
                        <Link
                          href="/recruiter/jobs"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4EAF3] bg-white text-[#68758B]"
                        >
                          <Pencil size={14} />
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
              {attentionJobs.length === 0 && (
                <p className="rounded-xl border border-dashed border-[#E4EAF3] px-4 py-8 text-center text-sm text-[#8793a6]">
                  Chưa có tin tuyển dụng. Hãy tạo tin mới.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#0B1C30]">
                Ứng viên mới nộp đơn cần xử lý
              </h2>
              <span className="rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-bold text-[#003C90]">
                {stats.unviewed} chưa xem
              </span>
            </div>
            <p className="mb-4 text-[11px] text-[#68758B]">
              Tuân thủ SLA phản hồi ứng viên trong 24 giờ (BR-R16).
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[10px] font-bold uppercase tracking-wide text-[#8793a6]">
                  <tr>
                    <th className="pb-2 pr-3">Họ tên</th>
                    <th className="pb-2 pr-3">Vị trí</th>
                    <th className="pb-2 pr-3">Nộp lúc</th>
                    <th className="pb-2">CV</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApps.map((app) => (
                    <tr key={app.id} className="border-t border-[#E4EAF3]">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white ${logoColor(app.candidate.fullName)}`}
                          >
                            {companyInitials(app.candidate.fullName)}
                          </span>
                          <div>
                            <p className="font-semibold text-[#0B1C30]">
                              {app.candidate.fullName}
                            </p>
                            <p className="text-[11px] text-[#8793a6]">
                              {app.candidate.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-xs text-[#44506A]">
                        {app.job.title}
                      </td>
                      <td className="py-3 pr-3 text-xs text-[#68758B]">
                        {relativeApplied(app.createdAt)}
                      </td>
                      <td className="py-3">
                        <a
                          href={app.cvUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F52BA]"
                        >
                          <FileText size={13} /> PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                  {recentApps.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-sm text-[#8793a6]"
                      >
                        Không có hồ sơ mới cần xử lý.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-right">
              <Link
                href="/recruiter/candidates"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F52BA]"
              >
                Quản lý ứng viên <ArrowRight size={12} />
              </Link>
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl border border-[#E4EAF3] bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-[#0B1C30]">
              Lịch phỏng vấn sắp tới
            </h3>
            <ul className="mt-3 space-y-3">
              {interviews.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-[#E4EAF3] bg-[#F8F9FF] p-3"
                >
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#003C90]">
                    <CalendarDays size={12} />
                    {interviewSlot(item.interviewScheduledAt)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#0B1C30]">
                    {item.candidate.fullName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#68758B]">
                    {item.job.title}
                  </p>
                </li>
              ))}
              {interviews.length === 0 && (
                <li className="rounded-xl border border-dashed border-[#E4EAF3] px-3 py-6 text-center text-xs text-[#8793a6]">
                  Chưa có lịch phỏng vấn sắp tới.
                </li>
              )}
            </ul>
          </section>

          <section className="rounded-2xl bg-[#003C90] p-4 text-white shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
              Quản lý tài khoản VIP B2B
            </p>
            <h3 className="mt-1 text-sm font-bold">Chuyên viên hỗ trợ riêng</h3>
            <div className="mt-3 space-y-1 text-xs text-white/90">
              <p>Vũ Quỳnh Nga</p>
              <p>Hotline 1900 6886 — Nhánh 3</p>
              <p>nga.vu@talenthub.vn</p>
            </div>
            <button
              type="button"
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-white text-xs font-semibold text-[#003C90]"
            >
              Yêu cầu hỗ trợ khẩn
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}
