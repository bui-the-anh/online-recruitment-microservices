"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Briefcase,
  Building2,
  CalendarDays,
  Globe,
  Heart,
  Laptop,
  MapPin,
  Share2,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import {
  companyInitials,
  formatSalaryRange,
  logoColor,
} from "@/lib/format";

type CompanyJob = {
  id: string;
  title: string;
  location: string;
  employmentType: string;
  workMode: string;
  category: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  fastResponse: boolean;
  publishedAt: string | null;
  createdAt: string;
  hot?: boolean;
  highSalary?: boolean;
};

type CompanyDetail = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  address: string | null;
  industry: string | null;
  website: string | null;
  companySize: string | null;
  foundedYear: number | null;
  followersCount: number;
  rating: number | null;
  reviewCount: number;
  benefits: string[];
  responseRate: number | null;
  avgResponseDays: number | null;
  coverUrl: string | null;
  featured: boolean;
  verified: boolean;
  openJobs: number;
  metrics: Array<{ label: string; value: string }>;
  cultureValues: Array<{ title: string; description: string }>;
  galleryUrls: string[];
  benefitsDetail: Array<{ title: string; description: string }>;
  team: Array<{ name: string; title?: string; email?: string }>;
  categories: string[];
  jobs: CompanyJob[];
};

const CULTURE_ICONS = [Zap, Sparkles, Users, Heart];
const BENEFIT_ICONS = [Wallet, BadgeCheck, Laptop, Briefcase];

function daysAgo(value: string | null | undefined): string {
  if (!value) return "Mới đăng";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  if (days === 0) return "Hôm nay";
  if (days === 1) return "1 ngày trước";
  return `${days} ngày trước`;
}

function formatFollowers(count: number): string {
  if (count >= 1000) {
    const value = count / 1000;
    return `+${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}K`;
  }
  return `+${count}`;
}

export default function CandidateCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const companyId = params.id;
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jobsVisible, setJobsVisible] = useState(4);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const query = category
          ? `?category=${encodeURIComponent(category)}`
          : "";
        const response = await api.get<CompanyDetail>(
          `/companies/${companyId}${query}`,
        );
        if (!cancelled) {
          setCompany(response.data);
          setJobsVisible(4);
        }
      } catch (requestError) {
        if (!cancelled) setError(formatApiError(requestError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (companyId) void load();
    return () => {
      cancelled = true;
    };
  }, [companyId, category]);

  const visibleJobs = useMemo(() => {
    if (!company) return [];
    return company.jobs.slice(0, jobsVisible);
  }, [company, jobsVisible]);

  if (loading) {
    return (
      <p className="px-4 py-16 text-center text-sm text-[#68758B]">
        Đang tải hồ sơ doanh nghiệp...
      </p>
    );
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-16 text-center">
        <p className="text-sm text-red-600">
          {error || "Không tìm thấy doanh nghiệp."}
        </p>
        <Link
          href="/candidate/companies"
          className="mt-4 inline-flex text-sm font-semibold text-[#0F52BA]"
        >
          Quay lại danh sách công ty
        </Link>
      </div>
    );
  }

  const gallery =
    company.galleryUrls.length > 0
      ? company.galleryUrls
      : company.coverUrl
        ? [company.coverUrl]
        : [];

  return (
    <div className="bg-[#F8F9FF]">
      <div className="relative h-48 w-full overflow-hidden sm:h-64 lg:h-72">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: company.coverUrl
              ? `url(${company.coverUrl})`
              : undefined,
            backgroundColor: "#003C90",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C30]/55 to-transparent" />
        <div className="absolute left-4 top-4 sm:left-6 lg:left-8">
          <Link
            href="/candidate/companies"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#0B1C30] backdrop-blur"
          >
            <ArrowLeft size={14} /> Công ty nổi bật
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <section className="relative z-10 -mt-16 rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm sm:-mt-20 sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white sm:h-20 sm:w-20 ${logoColor(company.name)}`}
            >
              {companyInitials(company.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-[#0B1C30]">
                  {company.name}
                </h1>
                {company.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#CFFAF3] px-2 py-0.5 text-[10px] font-semibold text-[#006A61]">
                    <BadgeCheck size={12} /> Verified
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-semibold text-[#0F52BA]">
                {company.industry || "Doanh nghiệp"}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#68758B]">
                {company.foundedYear && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={12} /> Thành lập {company.foundedYear}
                  </span>
                )}
                {company.companySize && (
                  <span className="inline-flex items-center gap-1">
                    <Users size={12} /> {company.companySize}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} />{" "}
                  {company.address || company.location || "Việt Nam"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E8ECF4] bg-white px-3 text-xs font-semibold text-[#44506A]"
              >
                <Heart size={14} /> Theo dõi{" "}
                <span className="text-[#8793a6]">
                  {formatFollowers(company.followersCount)}
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard?.writeText(window.location.href)
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8ECF4] text-[#68758B]"
                aria-label="Chia sẻ"
              >
                <Share2 size={16} />
              </button>
              <a
                href="#open-jobs"
                className="inline-flex h-10 items-center rounded-xl bg-[#003C90] px-4 text-xs font-semibold text-white"
              >
                Xem {company.openJobs} việc làm
              </a>
            </div>
          </div>
        </section>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-6">
              <h2 className="text-base font-bold text-[#0B1C30]">
                Giới thiệu chung &amp; Tầm nhìn
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#44506A]">
                {company.description ||
                  "Doanh nghiệp đang xây dựng thương hiệu tuyển dụng trên nền tảng."}
              </p>
              {company.metrics.length > 0 && (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {company.metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-xl bg-[#F8F9FF] px-3 py-4 text-center"
                    >
                      <p className="text-lg font-bold text-[#003C90]">
                        {metric.value}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-[#68758B]">
                        {metric.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {company.cultureValues.length > 0 && (
              <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-6">
                <h2 className="text-base font-bold text-[#0B1C30]">
                  Văn hóa làm việc &amp; Giá trị cốt lõi
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {company.cultureValues.map((item, index) => {
                    const Icon =
                      CULTURE_ICONS[index % CULTURE_ICONS.length];
                    return (
                      <div
                        key={item.title}
                        className="rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] p-4"
                      >
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF4FF] text-[#003C90]">
                          <Icon size={16} />
                        </span>
                        <p className="mt-3 text-sm font-bold text-[#0B1C30]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#68758B]">
                          {item.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {gallery.length > 0 && (
              <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-6">
                <h2 className="text-base font-bold text-[#0B1C30]">
                  Không gian làm việc &amp; Đời sống
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div
                    className="col-span-2 row-span-2 min-h-44 rounded-xl bg-cover bg-center sm:min-h-56"
                    style={{ backgroundImage: `url(${gallery[0]})` }}
                  />
                  {gallery.slice(1, 5).map((url) => (
                    <div
                      key={url}
                      className="min-h-24 rounded-xl bg-cover bg-center sm:min-h-28"
                      style={{ backgroundImage: `url(${url})` }}
                    />
                  ))}
                </div>
              </section>
            )}

            {(company.benefitsDetail.length > 0 ||
              company.benefits.length > 0) && (
              <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-6">
                <h2 className="text-base font-bold text-[#0B1C30]">
                  Chế độ đãi ngộ &amp; Phúc lợi
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(company.benefitsDetail.length > 0
                    ? company.benefitsDetail
                    : company.benefits.map((title) => ({
                        title,
                        description: "Phúc lợi dành cho toàn bộ nhân sự.",
                      }))
                  ).map((item, index) => {
                    const Icon =
                      BENEFIT_ICONS[index % BENEFIT_ICONS.length];
                    return (
                      <div
                        key={item.title}
                        className="flex gap-3 rounded-xl border border-[#E8ECF4] p-4"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFF4FF] text-[#003C90]">
                          <Icon size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#0B1C30]">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-[#68758B]">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-[#E8ECF4] bg-white p-4">
              <h3 className="text-sm font-bold text-[#0B1C30]">
                Chỉ số tuyển dụng
              </h3>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-[#68758B]">Tỷ lệ phản hồi</span>
                    <span className="font-bold text-[#006A61]">
                      {company.responseRate != null
                        ? `${company.responseRate}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#E8ECF4]">
                    <div
                      className="h-full rounded-full bg-[#006A61]"
                      style={{
                        width: `${Math.min(100, company.responseRate ?? 0)}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-[#68758B]">Thời gian phản hồi TB</span>
                    <span className="font-bold text-[#003C90]">
                      {company.avgResponseDays != null
                        ? `${company.avgResponseDays} ngày`
                        : "—"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#E8ECF4]">
                    <div
                      className="h-full rounded-full bg-[#0F52BA]"
                      style={{
                        width: `${Math.min(
                          100,
                          company.avgResponseDays != null
                            ? Math.max(15, 100 - company.avgResponseDays * 12)
                            : 0,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="rounded-xl bg-[#F8F9FF] px-3 py-3 text-center">
                  <p className="text-2xl font-bold text-[#003C90]">
                    {company.openJobs}
                  </p>
                  <p className="text-[11px] font-medium text-[#68758B]">
                    Việc làm đang mở
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8ECF4] bg-white p-4">
              <h3 className="text-sm font-bold text-[#0B1C30]">
                Đội ngũ tuyển dụng
              </h3>
              <ul className="mt-3 space-y-3">
                {company.team.map((member) => (
                  <li key={member.name} className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DCE9FF] text-xs font-bold text-[#003C90]">
                      {companyInitials(member.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0B1C30]">
                        {member.name}
                      </p>
                      <p className="truncate text-[11px] text-[#68758B]">
                        {member.title || "Recruiter"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[#E8ECF4] bg-white p-4">
              <h3 className="text-sm font-bold text-[#0B1C30]">
                Địa điểm văn phòng
              </h3>
              <div className="mt-3 overflow-hidden rounded-xl border border-[#E8ECF4]">
                <div
                  className="h-28 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url(https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&q=80)",
                  }}
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#44506A]">
                {company.address || company.location || "Việt Nam"}
              </p>
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0F52BA]"
                >
                  <Globe size={12} /> {company.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </aside>
        </div>

        <section
          id="open-jobs"
          className="mt-8 rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#0B1C30]">
                {company.openJobs} Việc làm đang tuyển dụng tại{" "}
                {company.name.split(" ")[0]}
              </h2>
              <p className="mt-1 text-xs text-[#68758B]">
                Lọc theo phòng ban và ứng tuyển trực tiếp.
              </p>
            </div>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] px-3 text-xs font-medium text-[#0B1C30]"
            >
              <option value="">Tất cả các phòng ban</option>
              {company.categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {visibleJobs.map((job) => (
              <article
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/candidate/jobs/${job.id}`}
                      className="text-sm font-bold text-[#0B1C30] hover:text-[#003C90]"
                    >
                      {job.title}
                    </Link>
                    {job.hot && (
                      <span className="rounded-full bg-[#FFE8E0] px-2 py-0.5 text-[10px] font-semibold text-[#B54708]">
                        Hot Job
                      </span>
                    )}
                    {job.highSalary && (
                      <span className="rounded-full bg-[#CFFAF3] px-2 py-0.5 text-[10px] font-semibold text-[#006A61]">
                        High Salary
                      </span>
                    )}
                    {job.category && (
                      <span className="rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[10px] font-semibold text-[#003C90]">
                        {job.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#68758B]">
                    <span>
                      {formatSalaryRange(
                        job.salaryMin,
                        job.salaryMax,
                        job.currency,
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={11} /> {job.location}
                    </span>
                    <span>{daysAgo(job.publishedAt || job.createdAt)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8ECF4] bg-white text-[#8793a6]"
                    aria-label="Lưu việc"
                  >
                    <Bookmark size={16} />
                  </button>
                  <Link
                    href={`/candidate/jobs/${job.id}/apply`}
                    className="inline-flex h-10 items-center rounded-xl bg-[#003C90] px-4 text-xs font-semibold text-white"
                  >
                    Ứng tuyển ngay
                  </Link>
                </div>
              </article>
            ))}
            {company.jobs.length === 0 && (
              <p className="py-8 text-center text-sm text-[#68758B]">
                Hiện chưa có việc làm mở phù hợp bộ lọc.
              </p>
            )}
          </div>

          {company.jobs.length > jobsVisible && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setJobsVisible((value) => value + 6)}
                className="inline-flex h-11 items-center rounded-xl border border-[#DCE9FF] px-5 text-xs font-semibold text-[#0F52BA] hover:bg-[#EFF4FF]"
              >
                Xem thêm {company.jobs.length - jobsVisible} vị trí khác
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="mt-10 border-t border-[#E8ECF4] bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-[#003C90]">
              <Building2 size={16} /> Tuyển dụng nhanh
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#68758B]">
              Kết nối ứng viên với doanh nghiệp đã xác thực trên toàn quốc.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-[#8793a6]">
              Ứng viên
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-[#44506A]">
              <li>
                <Link href="/candidate">Tìm việc</Link>
              </li>
              <li>
                <Link href="/candidate/companies">Công ty nổi bật</Link>
              </li>
              <li>
                <Link href="/candidate/applications">Đơn đã nộp</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-[#8793a6]">
              Doanh nghiệp
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-[#44506A]">
              <li>
                <Link href="/register/recruiter">Đăng tin tuyển dụng</Link>
              </li>
              <li>Employer branding</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-[#8793a6]">Hỗ trợ</p>
            <ul className="mt-2 space-y-1.5 text-xs text-[#44506A]">
              <li>Hotline 1900 6868</li>
              <li>support@tuyendungnhanh.vn</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
