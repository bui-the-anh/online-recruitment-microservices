"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarPlus,
  Clock3,
  Download,
  FileText,
  Filter,
  Info,
  MapPin,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import {
  companyInitials,
  formatSalaryRange,
  logoColor,
  workModeLabel,
} from "@/lib/format";

type ApplicationItem = {
  id: string;
  status: "APPLIED" | "VIEWED" | "INTERVIEW" | "ACCEPTED" | "REJECTED" | string;
  cvUrl: string;
  coverLetter: string | null;
  interviewScheduledAt: string | null;
  interviewDetails: string | null;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    location: string;
    employmentType: string;
    workMode: string;
    salaryMin: string | number | null;
    salaryMax: string | number | null;
    currency: string;
    company: {
      id: string;
      name: string;
      location: string | null;
    };
  };
};

type TabId = "all" | "applied" | "interview" | "done";

const STATUS_META: Record<
  string,
  { label: string; badge: string; accent: string }
> = {
  APPLIED: {
    label: "APPLIED - Đã nộp đơn",
    badge: "bg-[#EFF4FF] text-[#0F52BA]",
    accent: "border-l-[#0F52BA]",
  },
  VIEWED: {
    label: "VIEWED - Đã xem hồ sơ",
    badge: "bg-[#CFFAF3] text-[#006A61]",
    accent: "border-l-[#006A61]",
  },
  INTERVIEW: {
    label: "INTERVIEW - Mời phỏng vấn",
    badge: "bg-[#FFF1E6] text-[#B54708]",
    accent: "border-l-[#B54708]",
  },
  ACCEPTED: {
    label: "ACCEPTED - Nhận offer",
    badge: "bg-[#E8F8EF] text-[#0B6E4F]",
    accent: "border-l-[#0B6E4F]",
  },
  REJECTED: {
    label: "REJECTED - Từ chối",
    badge: "bg-red-50 text-red-600",
    accent: "border-l-red-500",
  },
};

function cvFileName(url: string): string {
  try {
    const path = decodeURIComponent(url.split("?")[0]);
    const name = path.split("/").pop() || "CV.pdf";
    return name.includes(".") ? name : `${name}.pdf`;
  } catch {
    return "CV.pdf";
  }
}

function formatSubmittedAt(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = date.toLocaleDateString("vi-VN");
  if (sameDay) return `Thời điểm nộp: ${time}, Hôm nay (${day})`;
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays > 0 && diffDays < 30) {
    return `${day} (${diffDays} ngày trước)`;
  }
  return day;
}

function statusMessage(item: ApplicationItem): string {
  if (item.status === "APPLIED") {
    return "Chờ nhà tuyển dụng tiếp nhận và phân loại hồ sơ sơ bộ.";
  }
  if (item.status === "VIEWED") {
    return `Nhà tuyển dụng đã mở hồ sơ của bạn vào lúc ${new Date(
      item.updatedAt,
    ).toLocaleString("vi-VN")}.`;
  }
  if (item.status === "INTERVIEW") {
    return (
      item.interviewDetails ||
      "Bạn đã được mời phỏng vấn. Vui lòng kiểm tra lịch hẹn bên dưới."
    );
  }
  if (item.status === "ACCEPTED") {
    return "Chúc mừng! Hồ sơ của bạn đã được chấp nhận.";
  }
  if (item.status === "REJECTED") {
    return "Đơn ứng tuyển chưa phù hợp lần này. Tiếp tục khám phá cơ hội khác.";
  }
  return "Đang cập nhật trạng thái hồ sơ.";
}

export default function CandidateApplicationsPage() {
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await api.get<ApplicationItem[]>("/applications");
        if (!cancelled) setItems(response.data);
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

  const stats = useMemo(() => {
    const total = items.length;
    const applied = items.filter((item) => item.status === "APPLIED").length;
    const interview = items.filter((item) => item.status === "INTERVIEW").length;
    const viewed = items.filter((item) => item.status === "VIEWED").length;
    const done = items.filter((item) =>
      ["ACCEPTED", "REJECTED"].includes(item.status),
    ).length;
    return { total, applied, interview, viewed, done };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (tab === "applied" && item.status !== "APPLIED") return false;
      if (tab === "interview" && item.status !== "INTERVIEW") return false;
      if (
        tab === "done" &&
        !["ACCEPTED", "REJECTED"].includes(item.status)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.job.title.toLowerCase().includes(q) ||
        item.job.company.name.toLowerCase().includes(q)
      );
    });
  }, [items, tab, query]);

  const tabs: Array<{ id: TabId; label: string; count: number }> = [
    { id: "all", label: "Tất cả đơn", count: stats.total },
    { id: "applied", label: "Đang chờ duyệt", count: stats.applied },
    { id: "interview", label: "Mời phỏng vấn", count: stats.interview },
    { id: "done", label: "Đã hoàn tất", count: stats.done },
  ];

  return (
    <div className="bg-[#F8F9FF]">
      <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0B1C30] sm:text-3xl">
              Hồ sơ đã ứng tuyển
            </h1>
            <p className="mt-1 text-sm text-[#68758B]">
              Theo dõi tiến trình và lịch hẹn cho từng đơn đã nộp.
            </p>
          </div>
          <Link
            href="/candidate"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#003C90] px-4 text-sm font-semibold text-white hover:bg-[#0F52BA]"
          >
            <Search size={16} />
            Khám phá thêm việc làm
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#E8ECF4] border-b-4 border-b-[#0F52BA] bg-white p-4">
            <p className="text-xs font-semibold text-[#68758B]">
              Tổng đơn đã nộp
            </p>
            <p className="mt-2 text-3xl font-bold text-[#0B1C30]">{stats.total}</p>
            <p className="mt-1 text-[11px] text-[#8793a6]">
              100% hồ sơ hoạt động
            </p>
          </div>
          <div className="rounded-2xl border border-[#E8ECF4] border-b-4 border-b-[#003C90] bg-white p-4">
            <p className="text-xs font-semibold text-[#68758B]">
              Đang chờ duyệt (APPLIED)
            </p>
            <p className="mt-2 text-3xl font-bold text-[#0B1C30]">
              {stats.applied}
            </p>
            <p className="mt-1 text-[11px] text-[#8793a6]">Sơ loại ban đầu</p>
          </div>
          <div className="rounded-2xl border border-[#E8ECF4] border-b-4 border-b-[#B54708] bg-white p-4">
            <p className="text-xs font-semibold text-[#68758B]">
              Mời phỏng vấn (INTERVIEW)
            </p>
            <p className="mt-2 text-3xl font-bold text-[#0B1C30]">
              {stats.interview}
            </p>
            <p className="mt-1 text-[11px] text-[#8793a6]">Lịch tuần này</p>
          </div>
          <div className="rounded-2xl border border-[#E8ECF4] border-b-4 border-b-[#006A61] bg-white p-4">
            <p className="text-xs font-semibold text-[#68758B]">
              Đã xem hồ sơ (VIEWED)
            </p>
            <p className="mt-2 text-3xl font-bold text-[#0B1C30]">
              {stats.viewed}
            </p>
            <p className="mt-1 text-[11px] text-[#8793a6]">NTD đã mở xem</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1 ring-1 ring-[#E8ECF4]">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  tab === item.id
                    ? "bg-[#EFF4FF] text-[#003C90]"
                    : "text-[#68758B] hover:text-[#0B1C30]"
                }`}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8793a6]"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Lọc theo công ty, vị trí..."
                className="h-10 w-56 rounded-xl border border-[#E8ECF4] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#0F52BA] sm:w-64"
              />
            </label>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E8ECF4] bg-white px-3 text-xs font-semibold text-[#68758B]"
            >
              <Filter size={14} /> Bộ lọc
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-center text-sm text-[#68758B]">
            Đang tải hồ sơ ứng tuyển...
          </p>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#E8ECF4] bg-white px-4 py-12 text-center">
            <p className="text-sm text-[#68758B]">
              Chưa có đơn phù hợp với bộ lọc hiện tại.
            </p>
            <Link
              href="/candidate"
              className="mt-3 inline-flex text-sm font-semibold text-[#0F52BA]"
            >
              Tìm việc ngay
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filtered.map((item) => {
              const meta = STATUS_META[item.status] ?? STATUS_META.APPLIED;
              const fileName = cvFileName(item.cvUrl);
              return (
                <article
                  key={item.id}
                  className={`rounded-2xl border border-[#E8ECF4] border-l-4 bg-white p-5 shadow-[0_10px_30px_-28px_rgba(25,43,77,0.45)] ${meta.accent}`}
                >
                  <div className="flex flex-wrap items-start gap-4">
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${logoColor(item.job.company.name)}`}
                    >
                      {companyInitials(item.job.company.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-[#0B1C30] sm:text-lg">
                              {item.job.title}
                            </h2>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.badge}`}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#68758B]">
                            <span className="inline-flex items-center gap-1">
                              <Building2 size={13} />
                              {item.job.company.name}
                              <BadgeCheck
                                size={13}
                                className="text-[#006A61]"
                              />
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={13} />
                              {item.job.location} (
                              {workModeLabel(item.job.workMode)})
                            </span>
                            <span className="inline-flex items-center gap-1 font-semibold text-[#006A61]">
                              <Wallet size={13} />
                              {formatSalaryRange(
                                item.job.salaryMin,
                                item.job.salaryMax,
                                item.job.currency,
                              )}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-[#8793a6]">
                          {formatSubmittedAt(item.createdAt)}
                        </p>
                      </div>

                      {item.status === "INTERVIEW" ? (
                        <div className="mt-3 rounded-xl border border-[#FFDBCA] bg-[#FFF7F2] px-3 py-3 text-xs leading-5 text-[#7A3410]">
                          <p className="inline-flex items-center gap-1.5 font-semibold">
                            <Clock3 size={14} />
                            {item.interviewDetails ||
                              "Đã có lịch phỏng vấn — kiểm tra thông báo để xem chi tiết."}
                          </p>
                          {item.interviewScheduledAt && (
                            <p className="mt-1 text-[#B54708]">
                              Thời gian:{" "}
                              {new Date(
                                item.interviewScheduledAt,
                              ).toLocaleString("vi-VN")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-3 inline-flex items-start gap-1.5 text-xs leading-5 text-[#68758B]">
                          <Info size={14} className="mt-0.5 shrink-0" />
                          {statusMessage(item)}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] px-3 py-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                          <FileText size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[#0B1C30]">
                            {fileName}
                          </p>
                          <p className="text-[11px] text-[#8793a6]">
                            CV đã nộp kèm đơn ứng tuyển
                          </p>
                        </div>
                        <a
                          href={item.cvUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#0F52BA] hover:bg-white"
                        >
                          <Download size={14} />
                          Tải CV
                        </a>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={item.cvUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center rounded-xl border border-[#DCE9FF] bg-white px-4 text-sm font-semibold text-[#0F52BA]"
                        >
                          Xem CV đã nộp
                        </a>
                        {item.status === "INTERVIEW" ? (
                          <>
                            <a
                              href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                                `Phỏng vấn: ${item.job.title}`,
                              )}&details=${encodeURIComponent(
                                item.interviewDetails || "",
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#FFDBCA] bg-white px-4 text-sm font-semibold text-[#B54708]"
                            >
                              <CalendarPlus size={15} />
                              Thêm vào Google Lịch
                            </a>
                            <Link
                              href={`/candidate/applications/${item.id}`}
                              className="inline-flex h-10 items-center rounded-xl bg-[#003C90] px-4 text-sm font-semibold text-white hover:bg-[#0F52BA]"
                            >
                              Xem chi tiết tiến trình &amp; Lịch hẹn →
                            </Link>
                          </>
                        ) : (
                          <Link
                            href={`/candidate/applications/${item.id}`}
                            className="inline-flex h-10 items-center rounded-xl bg-[#003C90] px-4 text-sm font-semibold text-white hover:bg-[#0F52BA]"
                          >
                            Xem chi tiết tiến trình →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex gap-3 rounded-2xl border border-[#DCE9FF] bg-[#EFF4FF] px-4 py-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#003C90]" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#003C90]">
              Ghi chú vận hành hồ sơ
            </p>
            <p className="mt-1 text-xs leading-5 text-[#44506A]">
              Trạng thái chuyển từ APPLIED → VIEWED khi nhà tuyển dụng mở CV,
              sang INTERVIEW khi có lịch hẹn, và kết thúc ở ACCEPTED/REJECTED.
              Bạn có thể theo dõi mọi cập nhật tại trang này.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
