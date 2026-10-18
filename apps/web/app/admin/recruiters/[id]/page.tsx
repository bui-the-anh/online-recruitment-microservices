"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Ban,
  Building2,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Lock,
  Mail,
  MapPin,
  Phone,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import {
  companyInitials,
  formatSalaryRange,
  logoColor,
  workModeLabel,
} from "@/lib/format";

type RecruiterDetail = {
  id: string;
  code: string;
  email: string;
  fullName: string;
  contactTitle: string;
  phone: string | null;
  accountStatus: "ACTIVE" | "SUSPENDED";
  verificationStatus: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | null;
  createdAt: string;
  company: {
    id: string;
    name: string;
    description: string | null;
    website: string | null;
    industry: string | null;
    location: string | null;
    address: string | null;
    taxCode: string | null;
    contactPhone: string | null;
    companySize: string | null;
    foundedYear: number | null;
    verificationDetails: string | null;
    licenseDocumentUrl: string | null;
    licenseDocumentName: string | null;
    createdAt: string;
  } | null;
  jobCounts: {
    approved: number;
    pending: number;
    rejected: number;
    closed: number;
    total: number;
  };
  jobs: Array<{
    id: string;
    title: string;
    location: string;
    workMode: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CLOSED";
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string;
    createdAt: string;
    publishedAt: string | null;
    applicants: number;
  }>;
};

function relativeHours(value: string): string {
  const hours = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 3600000),
  );
  if (hours < 1) return "Vừa đăng";
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function jobStatusBadge(status: string) {
  if (status === "APPROVED") {
    return (
      <span className="rounded-full bg-[#E6F7F2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#006A61]">
        Approved
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className="rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-bold uppercase text-[#B54708]">
        Pending
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="rounded-full bg-[#FDECEC] px-2 py-0.5 text-[10px] font-bold uppercase text-[#B42318]">
        Rejected
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-bold uppercase text-[#B54708]">
      Locked
    </span>
  );
}

export default function AdminRecruiterDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const recruiterId = params.id;
  const [data, setData] = useState<RecruiterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [acting, setActing] = useState(false);
  const [note, setNote] = useState("");
  const [jobFilter, setJobFilter] = useState<"ALL" | "APPROVED" | "PENDING" | "REJECTED">(
    "ALL",
  );
  const [zoom, setZoom] = useState(100);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<RecruiterDetail>(
        `/admin/recruiters/${recruiterId}`,
      );
      setData(response.data);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [recruiterId]);

  useEffect(() => {
    if (recruiterId) void load();
  }, [recruiterId, load]);

  const filteredJobs = useMemo(() => {
    if (!data) return [];
    if (jobFilter === "ALL") return data.jobs;
    return data.jobs.filter((job) => job.status === jobFilter);
  }, [data, jobFilter]);

  async function setVerification(status: "VERIFIED" | "REJECTED") {
    if (!data) return;
    setActing(true);
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/recruiters/${data.id}/verification`, {
        status,
        note:
          note.trim() ||
          (status === "VERIFIED"
            ? "Admin đã xác minh hồ sơ doanh nghiệp"
            : "GPKD/MST không hợp lệ"),
      });
      setMessage(status === "VERIFIED" ? "Đã duyệt xác minh." : "Đã từ chối.");
      setNote("");
      await load();
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setActing(false);
    }
  }

  async function setAccount(status: "ACTIVE" | "SUSPENDED") {
    if (!data) return;
    setActing(true);
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/recruiters/${data.id}/account-status`, { status });
      setMessage(
        status === "SUSPENDED" ? "Đã khóa tài khoản." : "Đã mở lại tài khoản.",
      );
      await load();
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <p className="px-4 py-16 text-center text-sm text-[#68758B]">
        Đang tải hồ sơ nhà tuyển dụng...
      </p>
    );
  }

  if (!data) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm text-red-600">
          {error || "Không tìm thấy nhà tuyển dụng."}
        </p>
        <Link
          href="/admin/recruiters"
          className="mt-4 inline-flex text-sm font-semibold text-[#0F52BA]"
        >
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const company = data.company;
  const licenseUrl =
    company?.licenseDocumentUrl ||
    "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
  const licenseName =
    company?.licenseDocumentName ||
    `DKKD_${company?.taxCode || "MST"}_SIGNED.pdf`;

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link
          href="/admin/recruiters"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F52BA]"
        >
          <ArrowLeft size={14} /> Danh sách Recruiter
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-bold text-white ${logoColor(company?.name || data.fullName)}`}
          >
            {companyInitials(company?.name || data.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-[#0B1C30] sm:text-2xl">
                {company?.name || data.fullName}
              </h1>
              {data.verificationStatus === "VERIFIED" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[10px] font-bold uppercase text-[#003C90]">
                  <BadgeCheck size={12} /> Verified
                </span>
              )}
              {data.accountStatus === "SUSPENDED" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FDECEC] px-2 py-0.5 text-[10px] font-bold uppercase text-[#B42318]">
                  <Ban size={12} /> Suspended
                </span>
              )}
            </div>
            <p className="mt-1 inline-flex rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[11px] font-semibold text-[#003C90]">
              #{data.code}
            </p>
            <div className="mt-3 space-y-1 text-xs text-[#68758B]">
              <p>
                Liên hệ:{" "}
                <span className="font-semibold text-[#0B1C30]">
                  {data.fullName}
                </span>{" "}
                ({data.contactTitle})
              </p>
              <p className="inline-flex items-center gap-1.5">
                <Mail size={12} /> {data.email}
              </p>
              <p className="inline-flex items-center gap-1.5">
                <Phone size={12} /> {data.phone || "Chưa cập nhật SĐT"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.verificationStatus === "PENDING_VERIFICATION" && (
              <>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void setVerification("VERIFIED")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#003C90] px-3 text-xs font-semibold text-white disabled:opacity-60"
                >
                  <Check size={14} /> Duyệt
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void setVerification("REJECTED")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#F5C2C0] bg-[#FDECEC] px-3 text-xs font-semibold text-[#B42318] disabled:opacity-60"
                >
                  <FileText size={14} /> Từ chối
                </button>
              </>
            )}
            {data.accountStatus === "ACTIVE" ? (
              <button
                type="button"
                disabled={acting}
                onClick={() => void setAccount("SUSPENDED")}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#B42318] px-3 text-xs font-semibold text-white disabled:opacity-60"
              >
                <Lock size={14} /> Khóa
              </button>
            ) : (
              <button
                type="button"
                disabled={acting}
                onClick={() => void setAccount("ACTIVE")}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#006A61] px-3 text-xs font-semibold text-white disabled:opacity-60"
              >
                Mở khóa
              </button>
            )}
          </div>
        </div>

        {(data.verificationStatus === "PENDING_VERIFICATION" ||
          data.verificationStatus === "REJECTED") && (
          <label className="mt-4 block text-xs">
            <span className="font-semibold text-[#68758B]">
              Ghi chú duyệt / từ chối
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-[#E4EAF3] bg-[#F8F9FF] px-3 py-2 text-sm outline-none"
              placeholder="Nhập ghi chú thẩm định..."
            />
          </label>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-[#0B1C30]">
          Hồ sơ pháp lý doanh nghiệp
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-[#F8F9FF] p-3">
            <p className="text-[11px] font-semibold uppercase text-[#8793a6]">
              Mã số thuế (MST)
            </p>
            <p className="mt-1 text-sm font-bold text-[#0B1C30]">
              {company?.taxCode || "—"}
            </p>
          </div>
          <div className="rounded-xl bg-[#F8F9FF] p-3">
            <p className="text-[11px] font-semibold uppercase text-[#8793a6]">
              Quy mô &amp; lĩnh vực
            </p>
            <p className="mt-1 inline-flex flex-wrap items-center gap-2 text-sm font-bold text-[#0B1C30]">
              <span className="inline-flex items-center gap-1">
                <Users size={13} /> {company?.companySize || "—"}
              </span>
              {company?.industry && (
                <span className="rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[10px] font-semibold text-[#003C90]">
                  {company.industry}
                </span>
              )}
            </p>
          </div>
          <div className="rounded-xl bg-[#F8F9FF] p-3">
            <p className="text-[11px] font-semibold uppercase text-[#8793a6]">
              Website
            </p>
            {company?.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#0F52BA]"
              >
                <Globe size={13} /> {company.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <p className="mt-1 text-sm font-bold text-[#0B1C30]">—</p>
            )}
          </div>
          <div className="rounded-xl bg-[#F8F9FF] p-3">
            <p className="text-[11px] font-semibold uppercase text-[#8793a6]">
              Thời điểm nộp
            </p>
            <p className="mt-1 text-sm font-bold text-[#0B1C30]">
              {new Date(company?.createdAt || data.createdAt).toLocaleString(
                "vi-VN",
              )}
            </p>
          </div>
          <div className="rounded-xl bg-[#F8F9FF] p-3 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase text-[#8793a6]">
              Địa chỉ đăng ký
            </p>
            <p className="mt-1 inline-flex items-start gap-1.5 text-sm font-medium text-[#0B1C30]">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              {company?.address || company?.location || "—"}
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-[#E4EAF3]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4EAF3] bg-[#F8F9FF] px-4 py-3">
            <div>
              <p className="text-sm font-bold text-[#0B1C30]">
                Giấy phép đăng ký kinh doanh (PDF thẩm định trực quan)
              </p>
              <p className="mt-0.5 text-[11px] text-[#68758B]">{licenseName}</p>
            </div>
            <a
              href={licenseUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F52BA]"
            >
              Mở tab mới <ExternalLink size={12} />
            </a>
          </div>
          <div className="relative bg-[#EEF2F7] p-4">
            <div
              className="mx-auto overflow-hidden rounded-xl border border-[#D5DEEA] bg-white shadow-sm"
              style={{ maxWidth: `${Math.min(720, zoom * 6)}px` }}
            >
              <div className="flex h-56 flex-col items-center justify-center gap-3 p-6 text-center sm:h-72">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDECEC] text-[#B42318]">
                  <FileText size={28} />
                </span>
                <p className="text-sm font-bold text-[#0B1C30]">{licenseName}</p>
                <span className="rounded-full border-2 border-[#B42318] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#B42318]">
                  Dấu đỏ hợp lệ
                </span>
                <p className="max-w-sm text-[11px] text-[#68758B]">
                  Bản xem trước minh họa. Dùng nút mở tab mới / tải về để thẩm định
                  file PDF gốc.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((value) => Math.max(80, value - 10))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4EAF3] bg-white text-[#68758B]"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-xs font-semibold text-[#44506A]">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((value) => Math.min(140, value + 10))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4EAF3] bg-white text-[#68758B]"
              >
                <ZoomIn size={14} />
              </button>
              <a
                href={licenseUrl}
                download
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E4EAF3] bg-white px-2 text-xs font-semibold text-[#003C90]"
              >
                <Download size={13} /> Tải PDF
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0B1C30]">
              Danh sách tin tuyển dụng
            </h2>
            <p className="mt-1 text-xs text-[#68758B]">
              Tổng hợp {data.jobCounts.total} chiến dịch tuyển dụng đã khởi tạo
              trên TalentHub.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setJobFilter("APPROVED")}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                jobFilter === "APPROVED"
                  ? "bg-[#006A61] text-white"
                  : "bg-[#E6F7F2] text-[#006A61]"
              }`}
            >
              {data.jobCounts.approved} Approved
            </button>
            <button
              type="button"
              onClick={() => setJobFilter("PENDING")}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                jobFilter === "PENDING"
                  ? "bg-[#B54708] text-white"
                  : "bg-[#FFF4E5] text-[#B54708]"
              }`}
            >
              {data.jobCounts.pending} Pending
            </button>
            <button
              type="button"
              onClick={() => setJobFilter("REJECTED")}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                jobFilter === "REJECTED"
                  ? "bg-[#68758B] text-white"
                  : "bg-[#F1F3F7] text-[#68758B]"
              }`}
            >
              {data.jobCounts.rejected} Rejected
            </button>
            <button
              type="button"
              onClick={() => setJobFilter("ALL")}
              className="rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-bold text-[#003C90]"
            >
              Tất cả
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredJobs.map((job) => (
            <article
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E4EAF3] bg-[#F8F9FF] p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-[#0B1C30]">{job.title}</p>
                  {jobStatusBadge(job.status)}
                  {job.status === "PENDING" && (
                    <span className="rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-semibold text-[#B54708]">
                      Đang đợi duyệt
                    </span>
                  )}
                </div>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#68758B]">
                  <span>
                    {job.location} ({workModeLabel(job.workMode)})
                  </span>
                  <span>
                    {formatSalaryRange(
                      job.salaryMin,
                      job.salaryMax,
                      job.currency,
                    )}
                  </span>
                  {job.status === "APPROVED" ? (
                    <span>{job.applicants} ứng viên</span>
                  ) : (
                    <span>{relativeHours(job.createdAt)}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {job.status === "PENDING" ? (
                  <Link
                    href="/admin/jobs"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#003C90] text-white"
                    aria-label="Đi duyệt tin"
                  >
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E4EAF3] bg-white text-[#8793a6]"
                    aria-label="Thêm"
                  >
                    <ChevronDown size={16} />
                  </button>
                )}
              </div>
            </article>
          ))}
          {filteredJobs.length === 0 && (
            <p className="rounded-xl border border-dashed border-[#E4EAF3] px-4 py-10 text-center text-sm text-[#8793a6]">
              Không có tin phù hợp bộ lọc.
            </p>
          )}
        </div>
      </section>

      <div className="mt-6 rounded-2xl border border-[#DCE9FF] bg-[#EFF4FF] px-4 py-3 text-xs text-[#003C90]">
        <span className="inline-flex items-center gap-2 font-semibold">
          <Building2 size={14} /> Cụm dịch vụ: Microservices Core · Auth / Jobs
          online
        </span>
      </div>
    </main>
  );
}
