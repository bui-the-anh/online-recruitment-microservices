"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Heart,
  LayoutGrid,
  List,
  MapPin,
  Search,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { companyInitials, logoColor } from "@/lib/format";

type CompanyCard = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  industry: string | null;
  website: string | null;
  companySize: string | null;
  rating: number | null;
  reviewCount: number;
  benefits: string[];
  responseRate: number | null;
  coverUrl: string | null;
  featured: boolean;
  verified: boolean;
  openJobs: number;
};

type CompaniesResponse = {
  items: CompanyCard[];
  total: number;
  page: number;
  pageSize: number;
  industries: string[];
  locations: string[];
  fastResponders: Array<{
    id: string;
    name: string;
    industry: string | null;
    responseRate: number;
  }>;
  favorites: Array<{ industry: string; percent: number; count: number }>;
};

const TRENDS = [
  "Fintech Kỹ Lõi",
  "AI Research Lab",
  "Lương tháng 13",
  "Hybrid linh hoạt",
  "SaaS Series B+",
];

const FAVORITE_COLORS = ["#003C90", "#0F52BA", "#006A61", "#5B4B8A"];

function StarRating({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-[#8793a6]">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B54708]">
      <Star size={12} className="fill-[#B54708] text-[#B54708]" />
      {value.toFixed(1)}
    </span>
  );
}

function DonutChart({
  segments,
}: {
  segments: Array<{ industry: string; percent: number }>;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#E8ECF4"
        strokeWidth="12"
      />
      {segments.map((segment, index) => {
        const length = (segment.percent / 100) * circumference;
        const dash = `${length} ${circumference - length}`;
        const el = (
          <circle
            key={segment.industry}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={FAVORITE_COLORS[index % FAVORITE_COLORS.length]}
            strokeWidth="12"
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
          />
        );
        offset += length;
        return el;
      })}
      <text
        x="50"
        y="48"
        textAnchor="middle"
        className="fill-[#0B1C30] text-[11px] font-bold"
      >
        2025
      </text>
      <text
        x="50"
        y="60"
        textAnchor="middle"
        className="fill-[#68758B] text-[7px]"
      >
        yêu thích
      </text>
    </svg>
  );
}

export default function CandidateCompaniesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [sort, setSort] = useState("featured");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [featured, setFeatured] = useState<CompanyCard[]>([]);
  const [data, setData] = useState<CompaniesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "6",
        sort,
      });
      if (search.trim()) params.set("search", search.trim());
      if (industry) params.set("industry", industry);
      if (location) params.set("location", location);

      const [listRes, featuredRes] = await Promise.all([
        api.get<CompaniesResponse>(`/companies?${params.toString()}`),
        api.get<{ items: CompanyCard[] }>("/companies/featured?limit=3"),
      ]);
      setData(listRes.data);
      setFeatured(featuredRes.data.items);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [page, sort, search, industry, location]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function applyTrend(tag: string) {
    setSearchInput(tag);
    setSearch(tag);
    setPage(1);
  }

  const favorites = data?.favorites ?? [];
  const fastResponders = data?.fastResponders ?? [];

  return (
    <div className="bg-[#F8F9FF]">
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[#E8ECF4] bg-gradient-to-br from-white via-[#F8F9FF] to-[#EAF1FF] px-5 py-8 sm:px-8">
          <h1 className="max-w-2xl text-2xl font-bold tracking-tight text-[#0B1C30] sm:text-3xl">
            Khám phá 1.000+ Doanh nghiệp &amp; Nhà tuyển dụng hàng đầu
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#68758B]">
            Lọc theo lĩnh vực, địa điểm và đánh giá để tìm môi trường làm việc phù hợp.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-6 flex flex-col gap-2 rounded-2xl border border-[#E8ECF4] bg-white p-2 shadow-sm sm:flex-row sm:items-center"
          >
            <label className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2">
              <Search size={16} className="shrink-0 text-[#8793a6]" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tên công ty hoặc từ khóa..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#A0A8B8]"
              />
            </label>
            <select
              value={industry}
              onChange={(event) => {
                setIndustry(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] px-3 text-sm text-[#0B1C30] sm:w-48"
            >
              <option value="">Lĩnh vực hoạt động</option>
              {(data?.industries ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] px-3 text-sm text-[#0B1C30] sm:w-48"
            >
              <option value="">Tất cả địa điểm</option>
              {(data?.locations ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#003C90] px-5 text-sm font-semibold text-white"
            >
              Tìm kiếm
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {TRENDS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => applyTrend(tag)}
                className="rounded-full border border-[#DCE9FF] bg-white px-3 py-1 text-[11px] font-semibold text-[#0F52BA] transition hover:bg-[#EFF4FF]"
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0F52BA]">
              Tiêu điểm tuyển dụng tuần này
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#0B1C30]">
              Top Doanh nghiệp Đột Phá Văn Hóa &amp; Phúc Lợi
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((company) => (
              <article
                key={company.id}
                className="overflow-hidden rounded-2xl border border-[#E8ECF4] bg-white shadow-sm"
              >
                <div
                  className="h-36 bg-cover bg-center"
                  style={{
                    backgroundImage: company.coverUrl
                      ? `url(${company.coverUrl})`
                      : undefined,
                    backgroundColor: "#DCE9FF",
                  }}
                />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${logoColor(company.name)}`}
                    >
                      {companyInitials(company.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#0B1C30]">
                        {company.name}
                      </p>
                      <StarRating value={company.rating} />
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[#68758B]">
                    {company.description || "Doanh nghiệp đang tuyển dụng."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {company.companySize && (
                      <span className="rounded-full bg-[#F8F9FF] px-2 py-0.5 text-[10px] font-medium text-[#44506A]">
                        {company.companySize}
                      </span>
                    )}
                    {company.industry && (
                      <span className="rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[10px] font-medium text-[#003C90]">
                        {company.industry}
                      </span>
                    )}
                    {company.benefits.slice(0, 2).map((benefit) => (
                      <span
                        key={benefit}
                        className="rounded-full bg-[#CFFAF3] px-2 py-0.5 text-[10px] font-medium text-[#006A61]"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#003C90]">
                      {company.openJobs} việc làm đang tuyển
                    </p>
                    <Link
                      href={`/candidate/companies/${company.id}`}
                      className="inline-flex h-9 items-center rounded-xl bg-[#003C90] px-3 text-xs font-semibold text-white"
                    >
                      Xem hồ sơ
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#0B1C30]">
                  Danh sách tất cả doanh nghiệp
                </h2>
                <p className="text-xs text-[#68758B]">
                  {data?.total ?? 0} công ty phù hợp
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-xl border border-[#E8ECF4] bg-white px-3 text-xs font-medium text-[#0B1C30]"
                >
                  <option value="featured">Nổi bật &amp; Đánh giá cao</option>
                  <option value="rating">Đánh giá cao nhất</option>
                  <option value="jobs">Nhiều việc mở nhất</option>
                </select>
                <div className="inline-flex rounded-xl border border-[#E8ECF4] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    className={`rounded-lg p-2 ${view === "grid" ? "bg-[#EFF4FF] text-[#003C90]" : "text-[#8793a6]"}`}
                    aria-label="Lưới"
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className={`rounded-lg p-2 ${view === "list" ? "bg-[#EFF4FF] text-[#003C90]" : "text-[#8793a6]"}`}
                    aria-label="Danh sách"
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <p className="py-10 text-sm text-[#68758B]">Đang tải danh sách...</p>
            ) : (
              <div
                className={
                  view === "grid"
                    ? "grid gap-4 sm:grid-cols-2"
                    : "flex flex-col gap-3"
                }
              >
                {(data?.items ?? []).map((company) => (
                  <article
                    key={company.id}
                    className="rounded-2xl border border-[#E8ECF4] bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${logoColor(company.name)}`}
                      >
                        {companyInitials(company.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-[#0B1C30]">
                              {company.name}
                              {company.verified && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#CFFAF3] px-1.5 py-0.5 text-[10px] font-semibold text-[#006A61]">
                                  <BadgeCheck size={11} /> Verified
                                </span>
                              )}
                            </p>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#68758B]">
                              <span className="inline-flex items-center gap-1">
                                <Building2 size={11} />
                                {company.industry || "Doanh nghiệp"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={11} />
                                {company.location || "Việt Nam"}
                              </span>
                              {company.companySize && (
                                <span className="inline-flex items-center gap-1">
                                  <Users size={11} />
                                  {company.companySize}
                                </span>
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="rounded-full p-1.5 text-[#C3C6D5] hover:bg-red-50 hover:text-red-500"
                            aria-label="Lưu công ty"
                          >
                            <Heart size={16} />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-xs text-[#68758B]">
                          <StarRating value={company.rating} />
                          {company.reviewCount > 0 && (
                            <span>({company.reviewCount} đánh giá)</span>
                          )}
                        </div>

                        {company.benefits.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {company.benefits.slice(0, 2).map((benefit) => (
                              <span
                                key={benefit}
                                className="rounded-full bg-[#F8F9FF] px-2 py-0.5 text-[10px] font-medium text-[#44506A]"
                              >
                                {benefit}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-[#003C90]">
                            {company.openJobs} vị trí đang mở
                          </p>
                          <Link
                            href={`/candidate/companies/${company.id}`}
                            className="inline-flex h-9 items-center rounded-xl border border-[#DCE9FF] px-3 text-xs font-semibold text-[#0F52BA] hover:bg-[#EFF4FF]"
                          >
                            Xem chi tiết
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
                {Array.from({ length: Math.min(totalPages, 8) }, (_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-semibold ${
                        page === pageNumber
                          ? "bg-[#003C90] text-white"
                          : "border border-[#E8ECF4] bg-white text-[#44506A] hover:bg-[#F8F9FF]"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-[#E8ECF4] bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#CFFAF3] text-[#006A61]">
                  <Zap size={15} />
                </span>
                <h3 className="text-sm font-bold text-[#0B1C30]">
                  Phản hồi siêu tốc
                </h3>
              </div>
              <ul className="space-y-3">
                {fastResponders.map((item) => (
                  <li key={item.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-[#0B1C30]">
                        {item.name}
                      </span>
                      <span className="font-bold text-[#006A61]">
                        {item.responseRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#E8ECF4]">
                      <div
                        className="h-full rounded-full bg-[#006A61]"
                        style={{
                          width: `${Math.min(100, item.responseRate)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
                {fastResponders.length === 0 && (
                  <li className="text-xs text-[#8793a6]">Chưa có dữ liệu.</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-[#E8ECF4] bg-white p-4">
              <h3 className="text-sm font-bold text-[#0B1C30]">
                Yêu thích nhất 2025
              </h3>
              <p className="mt-1 text-[11px] text-[#68758B]">
                Phân bố lĩnh vực từ khảo sát ứng viên trên nền tảng.
              </p>
              <div className="mt-4 flex items-center gap-4">
                <DonutChart segments={favorites} />
                <ul className="space-y-2 text-[11px]">
                  {favorites.map((item, index) => (
                    <li
                      key={item.industry}
                      className="flex items-center gap-2 text-[#44506A]"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            FAVORITE_COLORS[index % FAVORITE_COLORS.length],
                        }}
                      />
                      <span className="min-w-0 truncate">{item.industry}</span>
                      <span className="font-bold text-[#0B1C30]">
                        {item.percent}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {featured[0] && (
                <div className="mt-4 space-y-2 border-t border-[#E8ECF4] pt-3">
                  <div className="rounded-xl bg-[#F8F9FF] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-[#68758B]">
                      Benefits Champion
                    </p>
                    <p className="text-xs font-bold text-[#0B1C30]">
                      {featured[0].name}
                    </p>
                  </div>
                  {featured[1] && (
                    <div className="rounded-xl bg-[#F8F9FF] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase text-[#68758B]">
                        Inspirational Space
                      </p>
                      <p className="text-xs font-bold text-[#0B1C30]">
                        {featured[1].name}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      <footer className="mt-8 border-t border-[#E8ECF4] bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          <div>
            <p className="text-sm font-bold text-[#003C90]">Tuyển dụng nhanh</p>
            <p className="mt-2 text-xs leading-relaxed text-[#68758B]">
              Kết nối ứng viên với 1.000+ doanh nghiệp và hàng chục nghìn việc làm đang mở.
            </p>
            <p className="mt-3 text-xs font-semibold text-[#0B1C30]">
              60,000+ Việc làm · 1,000+ Doanh nghiệp
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#8793a6]">
              Dành cho ứng viên
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-[#44506A]">
              <li>
                <Link href="/candidate">Tìm việc làm</Link>
              </li>
              <li>
                <Link href="/candidate/applications">Theo dõi đơn</Link>
              </li>
              <li>
                <Link href="/candidate/profile">Tạo hồ sơ</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#8793a6]">
              Doanh nghiệp
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-[#44506A]">
              <li>Đăng tin tuyển dụng</li>
              <li>Employer branding</li>
              <li>Tìm ứng viên</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#8793a6]">
              Liên hệ &amp; Hỗ trợ
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-[#44506A]">
              <li>Hotline 1900 6868</li>
              <li>support@tuyendungnhanh.vn</li>
              <li>Hà Nội, Việt Nam</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
