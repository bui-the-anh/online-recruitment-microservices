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
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe,
  MapPin,
  Share2,
  ShieldCheck,
  Users,
  Wallet,
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

type JobDetail = {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
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
  publishedAt: string | null;
  company: {
    id: string;
    name: string;
    description: string | null;
    website: string | null;
    industry: string | null;
    location: string | null;
    recruiter?: { verificationStatus: string | null };
  };
  _count?: { applications: number };
};

type RelatedJob = {
  id: string;
  title: string;
  location: string;
  salaryMin: string | number | null;
  salaryMax: string | number | null;
  currency: string;
  company: { id: string; name: string };
};

const DEFAULT_BENEFITS = [
  "Lương thưởng cạnh tranh, review định kỳ 6–12 tháng",
  "Bảo hiểm sức khỏe & chế độ nghỉ phép linh hoạt",
  "Hỗ trợ thiết bị làm việc (laptop/phụ kiện)",
  "Đào tạo kỹ năng chuyên môn & lộ trình thăng tiến rõ ràng",
];

function splitLines(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/\n|•|-\s+/)
    .map((line) => line.replace(/^[\d.)\s]+/, "").trim())
    .filter((line) => line.length > 2);
}

export default function CandidateJobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [related, setRelated] = useState<RelatedJob[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get<JobDetail>(`/jobs/${params.id}`);
        if (cancelled) return;
        setJob(response.data);

        const relatedRes = await api
          .get<{ items: RelatedJob[] }>(
            `/jobs?pageSize=4${
              response.data.category
                ? `&category=${encodeURIComponent(response.data.category)}`
                : ""
            }`,
          )
          .catch(() => null);
        if (!cancelled && relatedRes) {
          setRelated(
            relatedRes.data.items.filter((item) => item.id !== response.data.id),
          );
        }
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
  }, [params.id]);

  const requirementItems = useMemo(
    () => splitLines(job?.requirements),
    [job?.requirements],
  );
  const descriptionParagraphs = useMemo(
    () =>
      (job?.description || "")
        .split(/\n{2,}|\n/)
        .map((part) => part.trim())
        .filter(Boolean),
    [job?.description],
  );

  if (loading) {
    return (
      <p className="mx-auto max-w-[1280px] px-4 py-16 text-center text-sm text-[#68758B]">
        Đang tải chi tiết công việc...
      </p>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error || "Không tìm thấy tin."}</p>
        <Link
          href="/candidate"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0F52BA]"
        >
          <ArrowLeft size={16} /> Quay lại trang chủ
        </Link>
      </div>
    );
  }

  const left = daysUntil(job.expiresAt);
  const verified =
    job.company.recruiter?.verificationStatus === "VERIFIED";

  return (
    <div className="bg-[#F8F9FF]">
      <div className="border-b border-[#E8ECF4] bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 text-sm sm:px-6 lg:px-8">
          <Link
            href="/candidate"
            className="inline-flex items-center gap-1.5 font-semibold text-[#0F52BA] hover:text-[#003C90]"
          >
            <ArrowLeft size={16} /> Việc làm
          </Link>
          <span className="text-[#C3C6D5]">/</span>
          <span className="truncate text-[#68758B]">{job.title}</span>
        </div>
      </div>

      <main className="mx-auto grid max-w-[1280px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8 lg:py-8">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-[0_12px_40px_-34px_rgba(25,43,77,0.4)] sm:p-7">
            <div className="flex items-start gap-4">
              <span
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white ${logoColor(job.company.name)}`}
              >
                {companyInitials(job.company.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0F52BA]">
                      <Link
                        href={`/candidate/companies/${job.company.id}`}
                        className="hover:underline"
                      >
                        {job.company.name}
                      </Link>
                      {verified && (
                        <BadgeCheck
                          size={16}
                          className="text-[#006A61]"
                          aria-label="Doanh nghiệp đã xác thực"
                        />
                      )}
                    </p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0B1C30] sm:text-[28px]">
                      {job.title}
                    </h1>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8ECF4] text-[#68758B] hover:bg-[#F8F9FF] hover:text-[#003C90]"
                      aria-label="Lưu việc làm"
                    >
                      <Bookmark size={18} />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8ECF4] text-[#68758B] hover:bg-[#F8F9FF] hover:text-[#003C90]"
                      aria-label="Chia sẻ"
                      onClick={() => {
                        void navigator.clipboard?.writeText(window.location.href);
                      }}
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-lg font-bold text-[#006A61]">
                  {formatSalaryRange(
                    job.salaryMin,
                    job.salaryMax,
                    job.currency,
                  )}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F9FF] px-3 py-1.5 text-xs text-[#68758B] ring-1 ring-[#E8ECF4]">
                    <MapPin size={13} /> {job.location}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F9FF] px-3 py-1.5 text-xs text-[#68758B] ring-1 ring-[#E8ECF4]">
                    <Briefcase size={13} />{" "}
                    {employmentTypeLabel(job.employmentType)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F9FF] px-3 py-1.5 text-xs text-[#68758B] ring-1 ring-[#E8ECF4]">
                    {workModeLabel(job.workMode)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F9FF] px-3 py-1.5 text-xs text-[#68758B] ring-1 ring-[#E8ECF4]">
                    Kinh nghiệm:{" "}
                    {experienceLabel(job.experienceMin, job.experienceMax)}
                  </span>
                  {job.category && (
                    <span className="rounded-full bg-[#EFF4FF] px-3 py-1.5 text-xs font-semibold text-[#003C90]">
                      {job.category}
                    </span>
                  )}
                  {job.fastResponse && (
                    <span className="rounded-full bg-[#CFFAF3] px-3 py-1.5 text-xs font-semibold text-[#006A61]">
                      Phản hồi hồ sơ trong 24h
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#68758B]">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={14} className="text-[#B54708]" />
                    Hạn nộp:{" "}
                    {left === null
                      ? "Không giới hạn"
                      : left < 0
                        ? "Đã hết hạn"
                        : `Còn ${left} ngày`}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={14} />
                    {job._count?.applications ?? 0} lượt nộp đơn
                  </span>
                  {job.publishedAt && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={14} />
                      Đăng{" "}
                      {new Date(job.publishedAt).toLocaleDateString("vi-VN")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-7">
            <h2 className="text-base font-bold text-[#0B1C30]">
              Mô tả công việc
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#44506A]">
              {descriptionParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-7">
            <h2 className="text-base font-bold text-[#0B1C30]">
              Yêu cầu ứng viên
            </h2>
            {requirementItems.length > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {requirementItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm leading-6 text-[#44506A]"
                  >
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-[#0F52BA]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[#68758B]">
                Nhà tuyển dụng chưa nêu yêu cầu chi tiết.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-7">
            <h2 className="text-base font-bold text-[#0B1C30]">Quyền lợi</h2>
            <ul className="mt-3 space-y-2.5">
              {DEFAULT_BENEFITS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm leading-6 text-[#44506A]"
                >
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-[#006A61]"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-7">
            <h2 className="text-base font-bold text-[#0B1C30]">Về công ty</h2>
            <div className="mt-4 flex items-start gap-3">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white ${logoColor(job.company.name)}`}
              >
                {companyInitials(job.company.name)}
              </span>
              <div>
                <p className="inline-flex items-center gap-1.5 font-semibold text-[#0B1C30]">
                  {job.company.name}
                  {verified && (
                    <BadgeCheck size={15} className="text-[#006A61]" />
                  )}
                </p>
                <p className="mt-1 text-xs text-[#68758B]">
                  {job.company.industry || "Doanh nghiệp"}
                  {job.company.location ? ` · ${job.company.location}` : ""}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#44506A]">
              {job.company.description ||
                "Doanh nghiệp đang tuyển dụng trên nền tảng Tuyển dụng nhanh."}
            </p>
            {job.company.website && (
              <a
                href={job.company.website}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F52BA]"
              >
                <Globe size={15} />
                Website công ty
                <ExternalLink size={13} />
              </a>
            )}
          </section>

          {related.length > 0 && (
            <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-7">
              <h2 className="text-base font-bold text-[#0B1C30]">
                Việc làm tương tự
              </h2>
              <div className="mt-4 space-y-3">
                {related.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={`/candidate/jobs/${item.id}`}
                    className="flex items-center gap-3 rounded-xl border border-[#F0F3F9] p-3 transition hover:border-[#DCE9FF] hover:bg-[#F8F9FF]"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white ${logoColor(item.company.name)}`}
                    >
                      {companyInitials(item.company.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0B1C30]">
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-[#68758B]">
                        {item.company.name} · {item.location}
                      </p>
                    </div>
                    <p className="hidden text-xs font-semibold text-[#006A61] sm:block">
                      {formatSalaryRange(
                        item.salaryMin,
                        item.salaryMax,
                        item.currency,
                      )}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-[0_12px_40px_-34px_rgba(25,43,77,0.4)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#68758B]">
              Ứng tuyển vị trí này
            </p>
            <p className="mt-2 text-xl font-bold text-[#006A61]">
              {formatSalaryRange(job.salaryMin, job.salaryMax, job.currency)}
            </p>
            <ul className="mt-4 space-y-2 text-xs text-[#68758B]">
              <li className="flex items-center gap-2">
                <Wallet size={14} className="text-[#0F52BA]" />
                Lương thỏa thuận minh bạch
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-[#006A61]" />
                {verified
                  ? "Doanh nghiệp đã xác thực"
                  : "Doanh nghiệp đang hoạt động"}
              </li>
              <li className="flex items-center gap-2">
                <Building2 size={14} className="text-[#0F52BA]" />
                {job.company.name}
              </li>
            </ul>

            <Link
              href={`/candidate/jobs/${job.id}/apply`}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#003C90] text-sm font-semibold text-white hover:bg-[#0F52BA]"
            >
              Ứng tuyển ngay
            </Link>
          </div>

          <div className="rounded-2xl border border-[#DCE9FF] bg-[#EFF4FF] p-5">
            <p className="text-sm font-bold text-[#0B1C30]">
              Mẹo tăng tỷ lệ được gọi
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[#44506A]">
              <li>• Cập nhật CV đúng stack trong tin tuyển dụng</li>
              <li>• Viết thư ngắn nêu 2–3 điểm khớp JD</li>
              <li>• Theo dõi trạng thái tại “Việc làm đã nộp”</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
