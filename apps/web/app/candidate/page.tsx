"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  Briefcase,
  Building2,
  Clock3,
  FilterX,
  Mail,
  MapPin,
  Search,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import {
  companyInitials,
  daysUntil,
  employmentTypeLabel,
  experienceLabel,
  formatSalaryRange,
  logoColor,
  workModeLabel,
} from "@/lib/format";

type JobItem = {
  id: string;
  title: string;
  location: string;
  employmentType: string;
  workMode: string;
  category: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  fastResponse: boolean;
  salaryMin: string | number | null;
  salaryMax: string | number | null;
  currency: string;
  expiresAt: string | null;
  company: {
    id: string;
    name: string;
    location: string | null;
    recruiter?: { verificationStatus: string | null };
  };
  _count?: { applications: number };
};

type JobsResponse = {
  items: JobItem[];
  total: number;
  totalOpen: number;
  page: number;
  pageSize: number;
  categories: Array<{ category: string; count: number }>;
};

type FeaturedCompany = {
  id: string;
  name: string;
  location: string | null;
  industry: string | null;
  verified: boolean;
  openJobs: number;
};

const POPULAR = ["ReactJS", "Product Design", "Golang"];

const EXPERIENCE_OPTIONS = [
  { label: "1 - 2 năm", value: "1" },
  { label: "3 - 5 năm", value: "3" },
  { label: "5+ năm", value: "5" },
];

const WORK_MODE_OPTIONS = [
  { label: "Hybrid", value: "HYBRID" },
  { label: "Onsite", value: "ONSITE" },
  { label: "Remote", value: "REMOTE" },
];

const SALARY_PRESETS = [
  { label: "15 - 25 triệu", min: "15000000", max: "25000000" },
  { label: "25 - 50 triệu", min: "25000000", max: "50000000" },
  { label: "50+ triệu", min: "50000000", max: "" },
];

export default function CandidateHomePage() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryLabel, setSalaryLabel] = useState("");
  const [experienceMin, setExperienceMin] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<JobsResponse | null>(null);
  const [companies, setCompanies] = useState<FeaturedCompany[]>([]);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "4");
      if (search.trim()) params.set("search", search.trim());
      if (location.trim()) params.set("location", location.trim());
      if (salaryMin) params.set("salaryMin", salaryMin);
      if (salaryMax) params.set("salaryMax", salaryMax);
      if (experienceMin) params.set("experienceMin", experienceMin);
      if (workMode) params.set("workMode", workMode);
      if (category) params.set("category", category);
      if (sort) params.set("sort", sort);

      const response = await api.get<JobsResponse>(`/jobs?${params.toString()}`);
      setData(response.data);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [
    page,
    search,
    location,
    salaryMin,
    salaryMax,
    experienceMin,
    workMode,
    category,
    sort,
  ]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    api
      .get<{ items: FeaturedCompany[] }>("/companies/featured?limit=5")
      .then((response) => setCompanies(response.data.items))
      .catch(() => setCompanies([]));
  }, []);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    void fetchJobs();
  }

  function clearFilters() {
    setSearch("");
    setLocation("");
    setSalaryMin("");
    setSalaryMax("");
    setSalaryLabel("");
    setExperienceMin("");
    setWorkMode("");
    setCategory("");
    setSort("");
    setPage(1);
  }

  function handleAlertSubmit(event: FormEvent) {
    event.preventDefault();
    if (!alertEmail.trim()) return;
    setAlertMessage(
      `Đã ghi nhận ${alertEmail.trim()}. Thông báo việc làm sẽ gửi vào 08:00 mỗi sáng (demo).`,
    );
    setAlertEmail("");
  }

  const categoryTabs = [
    {
      category: "",
      label: "Tất cả vị trí",
      count: data?.totalOpen ?? data?.total ?? 0,
    },
    ...(data?.categories ?? []).map((item) => ({
      category: item.category,
      label: item.category,
      count: item.count,
    })),
  ];

  return (
    <>
      <section className="border-b border-[#E8ECF4] bg-gradient-to-b from-white to-[#F8F9FF]">
        <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-[#0B1C30] sm:text-4xl">
              Chạm đến cơ hội{" "}
              <span className="text-[#0F52BA]">bứt phá sự nghiệp</span> tại Tuyển
              dụng nhanh
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#68758B]">
              Kết nối trực tiếp tới 1.000+ tập đoàn công nghệ &amp; tài chính dẫn
              đầu. Đãi ngộ minh bạch, bảo chứng quyền lợi ứng viên.
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="mx-auto mt-8 max-w-5xl rounded-2xl border border-[#E8ECF4] bg-white p-3 shadow-[0_18px_50px_-34px_rgba(0,60,144,0.45)] sm:p-4"
          >
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
              <label className="relative flex items-center">
                <Search
                  aria-hidden="true"
                  size={16}
                  className="pointer-events-none absolute left-3 text-[#8793a6]"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Chức danh, kỹ năng hoặc từ khóa"
                  className="h-12 w-full rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] pl-10 pr-10 text-sm outline-none focus:border-[#0F52BA] focus:bg-white"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 text-[#8793a6]"
                    aria-label="Xóa từ khóa"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>

              <label className="relative flex items-center">
                <MapPin
                  aria-hidden="true"
                  size={16}
                  className="pointer-events-none absolute left-3 text-[#8793a6]"
                />
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Địa điểm làm việc"
                  className="h-12 w-full rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] pl-10 pr-3 text-sm outline-none focus:border-[#0F52BA] focus:bg-white"
                />
              </label>

              <label className="relative flex items-center">
                <Wallet
                  aria-hidden="true"
                  size={16}
                  className="pointer-events-none absolute left-3 text-[#8793a6]"
                />
                <select
                  value={salaryLabel}
                  onChange={(event) => {
                    const preset = SALARY_PRESETS.find(
                      (item) => item.label === event.target.value,
                    );
                    setSalaryLabel(event.target.value);
                    setSalaryMin(preset?.min ?? "");
                    setSalaryMax(preset?.max ?? "");
                  }}
                  className="h-12 w-full appearance-none rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] pl-10 pr-3 text-sm outline-none focus:border-[#0F52BA] focus:bg-white"
                >
                  <option value="">Mức lương</option>
                  {SALARY_PRESETS.map((item) => (
                    <option key={item.label} value={item.label}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#003C90] px-5 text-sm font-semibold text-white transition hover:bg-[#0F52BA]"
              >
                Tìm việc ngay
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={experienceMin}
                onChange={(event) => {
                  setExperienceMin(event.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-full border border-[#E8ECF4] bg-white px-3 text-xs font-medium text-[#34445E]"
              >
                <option value="">Kinh nghiệm</option>
                {EXPERIENCE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={workMode}
                onChange={(event) => {
                  setWorkMode(event.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-full border border-[#E8ECF4] bg-white px-3 text-xs font-medium text-[#34445E]"
              >
                <option value="">Hình thức</option>
                {WORK_MODE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-[#0F52BA] hover:bg-[#EFF4FF]"
              >
                <FilterX size={14} aria-hidden="true" />
                Xóa lọc
              </button>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#68758B]">Tìm kiếm phổ biến</span>
                {POPULAR.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSearch(tag);
                      setPage(1);
                    }}
                    className="rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#003C90]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categoryTabs.map((tab) => {
            const active = category === tab.category;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setCategory(tab.category);
                  setPage(1);
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[#003C90] text-white"
                    : "bg-white text-[#68758B] ring-1 ring-[#E8ECF4] hover:text-[#003C90]"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        {error && (
          <p
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#0B1C30]">
                Việc làm nổi bật{" "}
                <span className="font-semibold text-[#68758B]">
                  ({category ? (data?.total ?? 0) : (data?.totalOpen ?? data?.total ?? 0)} vị trí)
                </span>
              </h2>
              <label className="flex items-center gap-2 text-xs text-[#68758B]">
                Sắp xếp theo
                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border border-[#E8ECF4] bg-white px-2 text-xs font-medium text-[#0B1C30]"
                >
                  <option value="">Phù hợp nhất</option>
                  <option value="salary_desc">Lương cao → thấp</option>
                  <option value="salary_asc">Lương thấp → cao</option>
                  <option value="deadline">Gần hạn nộp</option>
                </select>
              </label>
            </div>

            {loading ? (
              <p className="rounded-xl border border-dashed border-[#E8ECF4] bg-white px-4 py-10 text-center text-sm text-[#68758B]">
                Đang tải việc làm...
              </p>
            ) : !data?.items.length ? (
              <p className="rounded-xl border border-dashed border-[#E8ECF4] bg-white px-4 py-10 text-center text-sm text-[#68758B]">
                Không có tin phù hợp. Thử xóa bộ lọc hoặc seed dữ liệu demo.
              </p>
            ) : (
              <div className="space-y-4">
                {data.items.map((job) => {
                  const left = daysUntil(job.expiresAt);
                  return (
                    <article
                      key={job.id}
                      className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-[0_12px_40px_-34px_rgba(25,43,77,0.45)]"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${logoColor(job.company.name)}`}
                        >
                          {companyInitials(job.company.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="inline-flex items-center gap-1 text-xs font-medium text-[#68758B]">
                                {job.company.name}
                                {job.company.recruiter?.verificationStatus ===
                                  "VERIFIED" && (
                                  <BadgeCheck
                                    size={14}
                                    className="text-[#006A61]"
                                    aria-label="Doanh nghiệp đã xác thực"
                                  />
                                )}
                              </p>
                              <h3 className="mt-1 text-base font-bold text-[#0B1C30] sm:text-lg">
                                {job.title}
                              </h3>
                              <p className="mt-1 text-sm font-semibold text-[#006A61]">
                                {formatSalaryRange(
                                  job.salaryMin,
                                  job.salaryMax,
                                  job.currency,
                                )}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="rounded-lg p-2 text-[#8793a6] hover:bg-[#F8F9FF] hover:text-[#003C90]"
                              aria-label="Lưu việc làm"
                            >
                              <Bookmark size={18} />
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F9FF] px-2.5 py-1 text-[11px] text-[#68758B]">
                              <MapPin size={12} /> {job.location}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F9FF] px-2.5 py-1 text-[11px] text-[#68758B]">
                              <Briefcase size={12} />{" "}
                              {employmentTypeLabel(job.employmentType)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F9FF] px-2.5 py-1 text-[11px] text-[#68758B]">
                              {workModeLabel(job.workMode)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F9FF] px-2.5 py-1 text-[11px] text-[#68758B]">
                              Kinh nghiệm:{" "}
                              {experienceLabel(
                                job.experienceMin,
                                job.experienceMax,
                              )}
                            </span>
                            {job.fastResponse && (
                              <span className="rounded-full bg-[#CFFAF3] px-2.5 py-1 text-[11px] font-semibold text-[#006A61]">
                                Phản hồi hồ sơ trong 24h
                              </span>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0F3F9] pt-4">
                            <div className="flex flex-wrap gap-3 text-xs text-[#68758B]">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 size={13} className="text-[#B54708]" />
                                Hạn nộp:{" "}
                                {left === null
                                  ? "Không giới hạn"
                                  : left < 0
                                    ? "Đã hết hạn"
                                    : `Còn ${left} ngày`}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Users size={13} />
                                {job._count?.applications ?? 0} lượt nộp đơn
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Link
                                href={`/candidate/jobs/${job.id}`}
                                className="inline-flex h-10 items-center rounded-lg bg-[#EFF4FF] px-4 text-sm font-semibold text-[#0F52BA] transition hover:bg-[#DCE9FF]"
                              >
                                Xem chi tiết
                              </Link>
                              <Link
                                href={`/candidate/jobs/${job.id}/apply`}
                                className="inline-flex h-10 items-center rounded-lg bg-[#003C90] px-4 text-sm font-semibold text-white transition hover:bg-[#0F52BA]"
                              >
                                Ứng tuyển ngay
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {data && data.total > 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#68758B]">
                  Hiển thị {(page - 1) * data.pageSize + 1} -{" "}
                  {Math.min(page * data.pageSize, data.total)} trong số{" "}
                  {data.total} việc làm
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    className="h-9 rounded-lg border border-[#E8ECF4] bg-white px-3 text-xs font-semibold disabled:opacity-40"
                  >
                    Trước
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        className={`h-9 min-w-9 rounded-lg px-3 text-xs font-semibold ${
                          page === pageNumber
                            ? "bg-[#003C90] text-white"
                            : "border border-[#E8ECF4] bg-white text-[#68758B]"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((value) => Math.min(totalPages, value + 1))
                    }
                    className="h-9 rounded-lg border border-[#E8ECF4] bg-white px-3 text-xs font-semibold disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#E8ECF4] bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#0B1C30]">
                  Doanh nghiệp tiêu biểu
                </h2>
                <Link
                  href="/candidate/companies"
                  className="text-xs font-semibold text-[#0F52BA]"
                >
                  Xem tất cả
                </Link>
              </div>
              <div className="space-y-3">
                {companies.length === 0 ? (
                  <p className="text-xs text-[#68758B]">
                    Chưa có doanh nghiệp nổi bật.
                  </p>
                ) : (
                  companies.map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center gap-3 rounded-xl border border-[#F0F3F9] p-3"
                    >
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white ${logoColor(company.name)}`}
                      >
                        {companyInitials(company.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 truncate text-sm font-semibold text-[#0B1C30]">
                          {company.name}
                          {company.verified && (
                            <BadgeCheck
                              size={14}
                              className="shrink-0 text-[#006A61]"
                            />
                          )}
                        </p>
                        <p className="truncate text-[11px] text-[#68758B]">
                          {company.openJobs} vị trí ·{" "}
                          {company.location || "Việt Nam"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#DCE9FF] bg-[#EFF4FF] p-5">
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#003C90]">
                <Mail size={18} />
              </div>
              <h2 className="text-sm font-bold text-[#0B1C30]">
                Nhận thông báo việc làm phù hợp
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#68758B]">
                Gửi cơ hội mới nhất vào email mỗi sáng 08:00 AM theo đúng tiêu
                chí của bạn.
              </p>
              <form className="mt-4 space-y-2" onSubmit={handleAlertSubmit}>
                <input
                  type="email"
                  required
                  value={alertEmail}
                  onChange={(event) => setAlertEmail(event.target.value)}
                  placeholder="Nhập email của bạn..."
                  className="h-11 w-full rounded-xl border border-transparent bg-white px-3 text-sm outline-none focus:border-[#0F52BA]"
                />
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#003C90] text-sm font-semibold text-white hover:bg-[#0F52BA]"
                >
                  Đăng ký
                </button>
              </form>
              {alertMessage && (
                <p className="mt-3 text-xs text-[#006A61]">{alertMessage}</p>
              )}
            </div>
          </aside>
        </div>
      </main>

      <footer className="mt-8 border-t border-[#E8ECF4] bg-white">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#003C90] text-white">
                <Building2 size={16} />
              </span>
              <span className="font-bold text-[#003C90]">Tuyển dụng nhanh</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#68758B]">
              Nền tảng kết nối nhân tài công nghệ với doanh nghiệp đã xác thực
              tại Việt Nam.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#003C90]">
                60.000+ Việc làm
              </span>
              <span className="rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#003C90]">
                Top 1500 Doanh nghiệp
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0B1C30]">Dành cho ứng viên</h3>
            <ul className="mt-3 space-y-2 text-xs text-[#68758B]">
              <li>
                <Link href="/candidate">Tìm việc</Link>
              </li>
              <li>
                <Link href="/candidate/applications">Theo dõi đơn ứng tuyển</Link>
              </li>
              <li>
                <Link href="/register">Tạo hồ sơ online</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0B1C30]">Doanh nghiệp</h3>
            <ul className="mt-3 space-y-2 text-xs text-[#68758B]">
              <li>
                <Link href="/register/recruiter">Đăng tin tuyển dụng</Link>
              </li>
              <li>
                <Link href="/register/recruiter">Xây dựng thương hiệu</Link>
              </li>
              <li>
                <Link href="/">Tìm ứng viên</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0B1C30]">Liên hệ &amp; hỗ trợ</h3>
            <ul className="mt-3 space-y-2 text-xs text-[#68758B]">
              <li>Hotline: 1900 6868</li>
              <li>Email: support@talenthub.vn</li>
              <li>Keangnam Landmark 72, Hà Nội</li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
