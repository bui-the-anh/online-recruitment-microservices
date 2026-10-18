"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Lock,
  MapPin,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import {
  companyInitials,
  employmentTypeLabel,
  formatSalaryRange,
  logoColor,
  workModeLabel,
} from "@/lib/format";

type JobDetail = {
  id: string;
  title: string;
  location: string;
  employmentType: string;
  workMode: string;
  fastResponse: boolean;
  salaryMin: string | number | null;
  salaryMax: string | number | null;
  currency: string;
  company: {
    id: string;
    name: string;
    description: string | null;
    website: string | null;
    industry: string | null;
    location: string | null;
    recruiter?: { verificationStatus: string | null };
  };
};

type AuthUser = {
  id: string;
  email: string;
  fullName: string;
};

type CandidateProfile = {
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
  user?: AuthUser;
};

type UploadedCv = {
  url: string;
  fileName: string;
  size: number;
  uploadedAt: string;
};

const PROCESS_STEPS = [
  {
    title: "Gửi hồ sơ & Tiếp nhận",
    detail: "Hệ thống xác nhận đơn và thông báo cho nhà tuyển dụng.",
  },
  {
    title: "Đánh giá kỹ thuật",
    detail: "Thường mất 3–5 ngày làm việc để sàng lọc CV.",
  },
  {
    title: "Phỏng vấn trực tiếp / Online",
    detail: "Kết nối với hiring manager nếu hồ sơ phù hợp.",
  },
];

const COMPANY_SIZE: Record<string, string> = {
  "FinTech V-Pay": "250 - 500 nhân viên",
  "NexGen Soft": "50 - 200 nhân viên",
  "TrustCorp Capital": "500 - 1000 nhân viên",
  "AI Vision Labs": "11 - 50 nhân viên",
  "PixelCraft Studio": "11 - 50 nhân viên",
  "GrowthLab Media": "51 - 200 nhân viên",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function wordCount(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export default function CandidateApplyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [job, setJob] = useState<JobDetail | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [cv, setCv] = useState<UploadedCv | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [jobRes, meRes, profileRes] = await Promise.all([
          api.get<JobDetail>(`/jobs/${params.id}`),
          api.get<AuthUser>("/auth/me"),
          api.get<CandidateProfile>("/candidate/profile").catch(() => null),
        ]);
        if (cancelled) return;
        setJob(jobRes.data);
        setUser(meRes.data);
        setFullName(meRes.data.fullName);
        setEmail(meRes.data.email);
        setPhone(profileRes?.data.phone ?? "");
        setCoverLetter(
          `Kính gửi Đội ngũ Tuyển dụng ${jobRes.data.company.name},\n\nTôi là ${meRes.data.fullName}, rất quan tâm đến vị trí ${jobRes.data.title}. Tôi mong muốn được đóng góp kinh nghiệm của mình và đồng hành cùng đội ngũ của quý công ty.\n\nTrân trọng,\n${meRes.data.fullName}`,
        );
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

  const words = useMemo(() => wordCount(coverLetter), [coverLetter]);

  function autofill() {
    if (!user) return;
    setFullName(user.fullName);
    setEmail(user.email);
    setEditing(false);
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post<UploadedCv>("/uploads/cv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        transformRequest: [
          (data, headers) => {
            if (typeof FormData !== "undefined" && data instanceof FormData) {
              delete headers["Content-Type"];
            }
            return data;
          },
        ],
      });
      setCv(response.data);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!job) return;
    if (!cv?.url) {
      setError("Vui lòng tải lên CV trước khi gửi đơn.");
      return;
    }
    if (words > 1000) {
      setError("Thư giới thiệu tối đa 1000 từ.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (editing && phone.trim()) {
        await api.patch("/candidate/profile", {
          fullName: fullName.trim(),
          phone: phone.trim(),
        });
      }
      await api.post("/applications", {
        jobId: job.id,
        cvUrl: cv.url,
        coverLetter: coverLetter.trim() || undefined,
      });
      router.push("/candidate/applications");
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <p className="px-4 py-16 text-center text-sm text-[#68758B]">
        Đang tải biểu mẫu ứng tuyển...
      </p>
    );
  }

  if (!job || !user) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error || "Không tải được dữ liệu."}</p>
        <Link
          href="/candidate"
          className="mt-4 inline-flex text-sm font-semibold text-[#0F52BA]"
        >
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  const verified =
    job.company.recruiter?.verificationStatus === "VERIFIED";

  return (
    <div className="bg-[#F8F9FF]">
      <div className="border-b border-[#E8ECF4] bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 text-sm sm:px-6 lg:px-8">
          <Link
            href={`/candidate/jobs/${job.id}`}
            className="inline-flex items-center gap-1.5 font-semibold text-[#0F52BA]"
          >
            <ArrowLeft size={16} /> Chi tiết việc làm
          </Link>
          <span className="text-[#C3C6D5]">/</span>
          <span className="text-[#68758B]">Ứng tuyển</span>
        </div>
      </div>

      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start gap-4">
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-xl text-sm font-bold text-white ${logoColor(job.company.name)}`}
            >
              {companyInitials(job.company.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[#0B1C30] sm:text-2xl">
                  {job.title}
                </h1>
                <span className="rounded-full bg-[#CFFAF3] px-2.5 py-1 text-[11px] font-semibold text-[#006A61]">
                  Đang mở tuyển
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-[#0F52BA]">
                {job.company.name}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#68758B]">
                <span className="inline-flex items-center gap-1">
                  <Briefcase size={13} />{" "}
                  {employmentTypeLabel(job.employmentType)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} /> {job.location} ({workModeLabel(job.workMode)})
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#B54708]">
                  <Wallet size={13} />{" "}
                  {formatSalaryRange(
                    job.salaryMin,
                    job.salaryMax,
                    job.currency,
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#003C90] text-xs font-bold text-white">
                    1
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-[#0B1C30]">
                      Thông tin người nộp đơn
                    </h2>
                    <p className="mt-1 text-xs text-[#68758B]">
                      Dữ liệu hồ sơ xác thực từ tài khoản (Tuân thủ BR-C01)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={autofill}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFF4FF] px-3 py-2 text-xs font-semibold text-[#0F52BA]"
                >
                  <Sparkles size={14} /> Tự động điền
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <label className="block text-xs font-semibold text-[#303c50]">
                  Họ và tên
                  <div className="relative mt-1.5">
                    <input
                      value={fullName}
                      disabled={!editing}
                      onChange={(event) => setFullName(event.target.value)}
                      className="h-11 w-full rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] px-3 pr-24 text-sm disabled:text-[#0B1C30]"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#CFFAF3] px-2 py-0.5 text-[10px] font-semibold text-[#006A61]">
                      Đã xác minh
                    </span>
                  </div>
                </label>
                <label className="block text-xs font-semibold text-[#303c50]">
                  Email liên hệ
                  <div className="relative mt-1.5">
                    <Lock
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8793a6]"
                    />
                    <input
                      value={email}
                      disabled
                      className="h-11 w-full rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] pl-9 pr-3 text-sm text-[#0B1C30]"
                    />
                  </div>
                </label>
                <label className="block text-xs font-semibold text-[#303c50]">
                  Số điện thoại
                  <div className="relative mt-1.5">
                    <Phone
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8793a6]"
                    />
                    <input
                      value={phone}
                      disabled={!editing}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="0912 345 678"
                      className="h-11 w-full rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] pl-9 pr-3 text-sm disabled:text-[#0B1C30]"
                    />
                  </div>
                </label>
              </div>
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className="mt-3 text-xs font-semibold text-[#0F52BA]"
              >
                {editing ? "Xong" : "Chỉnh sửa"}
              </button>
            </section>

            <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#003C90] text-xs font-bold text-white">
                  2
                </span>
                <div>
                  <h2 className="inline-flex items-center gap-2 text-sm font-bold text-[#0B1C30]">
                    Tải tệp CV trực tiếp theo đơn
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                      BẮT BUỘC
                    </span>
                  </h2>
                </div>
              </div>

              <div className="mt-4 flex gap-2 rounded-xl border border-[#DCE9FF] bg-[#EFF4FF] px-3 py-3 text-xs leading-5 text-[#38527a]">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#0F52BA]" />
                <p>
                  CV này chỉ gắn với đơn ứng tuyển hiện tại, không ghi đè CV mặc
                  định trong hồ sơ cá nhân.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                onChange={(event) =>
                  void handleFile(event.target.files?.[0] ?? null)
                }
              />

              {cv ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] p-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <FileText size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#0B1C30]">
                      {cv.fileName}
                    </p>
                    <p className="text-xs text-[#68758B]">
                      {formatFileSize(cv.size)} · Đã tải lên{" "}
                      {new Date(cv.uploadedAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      hôm nay
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#0F52BA] ring-1 ring-[#DCE9FF]"
                  >
                    <RefreshCw size={13} /> Đổi file
                  </button>
                  <button
                    type="button"
                    onClick={() => setCv(null)}
                    className="rounded-lg p-2 text-[#8793a6] hover:bg-white hover:text-red-600"
                    aria-label="Xóa CV"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 flex w-full flex-col items-center rounded-xl border border-dashed border-[#b7c9e8] bg-[#eff4ff]/70 px-4 py-10 text-center hover:border-[#0F52BA]"
                >
                  <Upload size={22} className="text-[#0F52BA]" />
                  <p className="mt-3 text-sm font-semibold text-[#25334b]">
                    {uploading
                      ? "Đang tải CV lên..."
                      : "Kéo thả hoặc chọn tệp CV"}
                  </p>
                  <p className="mt-1 text-xs text-[#68758B]">
                    Hỗ trợ PDF, DOCX · Dung lượng tối đa 5MB
                  </p>
                </button>
              )}

              <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[#68758B]">
                <span>Hỗ trợ định dạng: PDF, DOCX</span>
                <span>Dung lượng tối đa: &lt; 5MB</span>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#003C90] text-xs font-bold text-white">
                  3
                </span>
                <div className="flex-1">
                  <h2 className="inline-flex items-center gap-2 text-sm font-bold text-[#0B1C30]">
                    Thư giới thiệu &amp; Lời nhắn
                    <span className="rounded-full bg-[#F0F3F9] px-2 py-0.5 text-[10px] font-semibold text-[#68758B]">
                      TÙY CHỌN
                    </span>
                  </h2>
                  <textarea
                    value={coverLetter}
                    onChange={(event) => setCoverLetter(event.target.value)}
                    rows={8}
                    className="mt-4 w-full rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] px-4 py-3 text-sm leading-6 text-[#0B1C30] outline-none focus:border-[#0F52BA] focus:bg-white"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#68758B]">
                    <p>
                      Gợi ý: Nhấn mạnh kinh nghiệm liên quan trực tiếp đến yêu
                      cầu của tin tuyển dụng.
                    </p>
                    <p className={words > 1000 ? "text-red-600" : ""}>
                      {words} / 1000 từ
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="rounded-2xl border border-[#CFFAF3] bg-[#F0FDFA] px-4 py-4">
              <div className="flex gap-3">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-[#006A61]"
                />
                <div>
                  <p className="text-sm font-semibold text-[#0B1C30]">
                    Xác thực tính hợp lệ &amp; Chống trùng lặp đơn
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#44506A]">
                    Hệ thống kiểm tra bạn chưa nộp đơn cho vị trí này. Sau khi
                    gửi, trạng thái sẽ là{" "}
                    <span className="font-semibold">APPLIED</span> trong mục
                    Việc làm đã nộp.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <p
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href={`/candidate/jobs/${job.id}`}
                className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-[#68758B] hover:bg-white"
              >
                <ArrowLeft size={16} /> Hủy bỏ / Quay lại
              </Link>
              <button
                type="submit"
                disabled={submitting || uploading || !cv}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#003C90] px-5 text-sm font-semibold text-white hover:bg-[#0F52BA] disabled:opacity-60"
              >
                {submitting ? "Đang gửi đơn..." : "Xác nhận gửi đơn ứng tuyển"}
                <Send size={16} />
              </button>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-[#E8ECF4] bg-white">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-xs font-bold text-white ${logoColor(job.company.name)}`}
                  >
                    {companyInitials(job.company.name)}
                  </span>
                  <div>
                    <p className="inline-flex items-center gap-1 font-semibold text-[#0B1C30]">
                      {job.company.name}
                      {verified && (
                        <BadgeCheck size={14} className="text-[#006A61]" />
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-[#68758B]">
                      {job.company.description?.slice(0, 80) ||
                        "Doanh nghiệp đang tuyển dụng"}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 space-y-2 text-xs text-[#68758B]">
                  <div className="flex justify-between gap-3">
                    <dt>Quy mô nhân sự</dt>
                    <dd className="font-semibold text-[#0B1C30]">
                      {COMPANY_SIZE[job.company.name] || "Đang cập nhật"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Lĩnh vực</dt>
                    <dd className="text-right font-semibold text-[#0B1C30]">
                      {job.company.industry || "Chưa cập nhật"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Thời gian phản hồi</dt>
                    <dd
                      className={`font-semibold ${
                        job.fastResponse ? "text-[#006A61]" : "text-[#0B1C30]"
                      }`}
                    >
                      {job.fastResponse
                        ? "Thường trong 24 giờ"
                        : "3–5 ngày làm việc"}
                    </dd>
                  </div>
                </dl>
              </div>
              <div
                className="h-28 bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url(https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80)",
                }}
                role="img"
                aria-label="Không gian làm việc"
              />
              {job.company.website && (
                <a
                  href={job.company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 border-t border-[#E8ECF4] px-4 py-3 text-xs font-semibold text-[#0F52BA]"
                >
                  <Building2 size={14} /> Xem trang doanh nghiệp
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div className="rounded-2xl border border-[#E8ECF4] bg-white p-5">
              <h3 className="text-sm font-bold text-[#0B1C30]">
                Lộ trình xử lý hồ sơ
              </h3>
              <ol className="mt-4 space-y-4">
                {PROCESS_STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EFF4FF] text-xs font-bold text-[#003C90]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#0B1C30]">
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-[#68758B]">
                        {step.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}
