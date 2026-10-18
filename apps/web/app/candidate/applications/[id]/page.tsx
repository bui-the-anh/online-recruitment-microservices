"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Hourglass,
  Lock,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import {
  companyInitials,
  formatSalaryRange,
  logoColor,
  workModeLabel,
} from "@/lib/format";

type ApplicationDetail = {
  id: string;
  status: string;
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
      description: string | null;
      website: string | null;
      industry: string | null;
      location: string | null;
      recruiter?: {
        fullName: string;
        verificationStatus: string | null;
      };
    };
  };
};

type StepState = "done" | "current" | "pending";

const COMPANY_SIZE: Record<string, string> = {
  "FinTech V-Pay": "500 - 1000 nhân viên",
  "NexGen Soft": "50 - 200 nhân viên",
  "TrustCorp Capital": "500 - 1000 nhân viên",
  "AI Vision Labs": "11 - 50 nhân viên",
  "PixelCraft Studio": "11 - 50 nhân viên",
  "GrowthLab Media": "51 - 200 nhân viên",
};

function statusRank(status: string): number {
  if (status === "APPLIED") return 0;
  if (status === "VIEWED") return 1;
  if (status === "INTERVIEW") return 2;
  if (status === "ACCEPTED" || status === "REJECTED") return 3;
  return 0;
}

function cvFileName(url: string): string {
  try {
    const name = decodeURIComponent(url.split("?")[0]).split("/").pop();
    return name && name.includes(".") ? name : "CV_UngTuyen.pdf";
  } catch {
    return "CV_UngTuyen.pdf";
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function headerStatusLabel(status: string): string {
  if (status === "INTERVIEW") return "Đang xử lý (INTERVIEW)";
  if (status === "VIEWED") return "Đang xử lý (VIEWED)";
  if (status === "APPLIED") return "Đang xử lý (APPLIED)";
  if (status === "ACCEPTED") return "Hoàn tất (ACCEPTED)";
  if (status === "REJECTED") return "Kết thúc (REJECTED)";
  return status;
}

export default function ApplicationProgressPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get<ApplicationDetail>(
          `/applications/${params.id}`,
        );
        if (!cancelled) setItem(response.data);
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

  const steps = useMemo(() => {
    if (!item) return [];
    const rank = statusRank(item.status);
    const hrName = item.job.company.recruiter?.fullName || "HR";
    const viewedAt =
      rank >= 1
        ? new Date(
            new Date(item.createdAt).getTime() + 3.5 * 60 * 60 * 1000,
          ).toISOString()
        : null;

    const buildState = (index: number): StepState => {
      if (index < rank) return "done";
      if (index === rank && item.status !== "ACCEPTED" && item.status !== "REJECTED") {
        return "current";
      }
      if (index === 3 && (item.status === "ACCEPTED" || item.status === "REJECTED")) {
        return "done";
      }
      return "pending";
    };

    return [
      {
        key: "APPLIED",
        title: "Đã gửi đơn (APPLIED)",
        state: buildState(0),
        time: item.createdAt,
        description:
          "Đơn ứng tuyển đã được gửi tới đội Talent Acquisition của doanh nghiệp.",
      },
      {
        key: "VIEWED",
        title: "Nhà tuyển dụng đã xem (VIEWED)",
        state: buildState(1),
        time: viewedAt,
        description:
          rank >= 1
            ? `${hrName} đã xem và chuyển CV tới Technical Lead để đánh giá chuyên môn.`
            : "Khi nhà tuyển dụng mở hồ sơ, bước này sẽ được cập nhật.",
      },
      {
        key: "INTERVIEW",
        title: "Mời phỏng vấn (INTERVIEW)",
        state: buildState(2),
        time: item.interviewScheduledAt,
        description:
          rank >= 2
            ? item.interviewDetails ||
              "Chúc mừng! Bạn đã vượt qua vòng sàng lọc và được mời phỏng vấn."
            : "Lịch phỏng vấn sẽ hiện tại đây khi nhà tuyển dụng mời bạn.",
      },
      {
        key: "FINAL",
        title:
          item.status === "REJECTED"
            ? "Kết quả cuối cùng (REJECTED)"
            : "Kết quả cuối cùng (ACCEPTED / REJECTED)",
        state: buildState(3),
        time:
          item.status === "ACCEPTED" || item.status === "REJECTED"
            ? item.updatedAt
            : null,
        description:
          item.status === "ACCEPTED"
            ? "Bạn đã nhận offer. Kiểm tra email để hoàn tất thủ tục."
            : item.status === "REJECTED"
              ? "Đơn chưa phù hợp lần này. Tiếp tục khám phá cơ hội khác trên nền tảng."
              : "Quyết định cuối / Offer Letter sẽ được gửi sau vòng phỏng vấn.",
      },
    ];
  }, [item]);

  const currentStage = useMemo(() => {
    if (!item) return 1;
    const rank = statusRank(item.status);
    return Math.min(rank + 1, 4);
  }, [item]);

  if (loading) {
    return (
      <p className="px-4 py-16 text-center text-sm text-[#68758B]">
        Đang tải tiến trình đơn...
      </p>
    );
  }

  if (!item) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error || "Không tìm thấy đơn."}</p>
        <Link
          href="/candidate/applications"
          className="mt-4 inline-flex text-sm font-semibold text-[#0F52BA]"
        >
          Quay lại danh sách đơn
        </Link>
      </div>
    );
  }

  const verified =
    item.job.company.recruiter?.verificationStatus === "VERIFIED";
  const fileName = cvFileName(item.cvUrl);

  return (
    <div className="bg-[#F8F9FF]">
      <div className="border-b border-[#E8ECF4] bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3 text-sm sm:px-6 lg:px-8">
          <Link
            href="/candidate/applications"
            className="inline-flex items-center gap-1.5 font-semibold text-[#0F52BA]"
          >
            <ArrowLeft size={16} /> Việc làm đã nộp
          </Link>
          <span className="text-[#C3C6D5]">/</span>
          <span className="truncate text-[#68758B]">Tiến trình đơn</span>
        </div>
      </div>

      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-xl text-sm font-bold text-white ${logoColor(item.job.company.name)}`}
            >
              {companyInitials(item.job.company.name)}
            </span>
            <div className="min-w-0 flex-1">
              <span className="inline-flex rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#0F52BA]">
                {headerStatusLabel(item.status)}
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0B1C30]">
                {item.job.title}
              </h1>
              <p className="mt-1 text-sm font-medium text-[#0F52BA]">
                {item.job.company.name}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#68758B]">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} />
                  {item.job.location} ({workModeLabel(item.job.workMode)})
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={13} />
                  Nộp ngày: {formatDateTime(item.createdAt)}
                </span>
              </div>
            </div>
            <div className="w-full rounded-xl bg-[#EFF4FF] px-4 py-3 sm:w-auto sm:min-w-[220px]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#68758B]">
                Mức lương dự kiến
              </p>
              <p className="mt-1 text-sm font-bold text-[#003C90]">
                {formatSalaryRange(
                  item.job.salaryMin,
                  item.job.salaryMax,
                  item.job.currency,
                )}
              </p>
              <Link
                href={`/candidate/jobs/${item.job.id}`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0F52BA]"
              >
                Chi tiết tin tuyển <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#0B1C30]">
                    Tiến trình xét duyệt hồ sơ
                  </h2>
                  <p className="mt-1 text-xs text-[#68758B]">
                    Quy trình 4 giai đoạn minh bạch theo trạng thái đơn.
                  </p>
                </div>
                <span className="rounded-full bg-[#CFFAF3] px-2.5 py-1 text-[11px] font-semibold text-[#006A61]">
                  Giai đoạn {currentStage} / 4
                </span>
              </div>

              <ol className="relative mt-6 space-y-0">
                {steps.map((step, index) => {
                  const isLast = index === steps.length - 1;
                  const Icon =
                    step.state === "done"
                      ? CheckCircle2
                      : step.state === "current"
                        ? CalendarDays
                        : Hourglass;
                  return (
                    <li key={step.key} className="relative flex gap-4 pb-6">
                      {!isLast && (
                        <span
                          className={`absolute left-[15px] top-8 h-[calc(100%-16px)] w-0.5 ${
                            step.state === "done"
                              ? "bg-[#0F52BA]"
                              : "bg-[#E8ECF4]"
                          }`}
                        />
                      )}
                      <span
                        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          step.state === "done"
                            ? "bg-[#0F52BA] text-white"
                            : step.state === "current"
                              ? "bg-[#EFF4FF] text-[#0F52BA] ring-2 ring-[#0F52BA]"
                              : "bg-[#F0F3F9] text-[#8793a6]"
                        }`}
                      >
                        <Icon size={16} />
                      </span>
                      <div
                        className={`min-w-0 flex-1 rounded-xl px-3 py-3 ${
                          step.state === "current"
                            ? "border border-[#DCE9FF] bg-[#EFF4FF]"
                            : ""
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-[#0B1C30]">
                            {step.title}
                          </h3>
                          {step.state === "done" && (
                            <span className="rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[10px] font-semibold text-[#0F52BA]">
                              Hoàn thành
                            </span>
                          )}
                          {step.state === "current" && (
                            <span className="rounded-full bg-[#003C90] px-2 py-0.5 text-[10px] font-semibold text-white">
                              ĐANG DIỄN RA
                            </span>
                          )}
                          {step.state === "pending" && (
                            <span className="rounded-full bg-[#F0F3F9] px-2 py-0.5 text-[10px] font-semibold text-[#8793a6]">
                              Đang chờ
                            </span>
                          )}
                        </div>
                        {step.time && (
                          <p className="mt-1 text-[11px] text-[#8793a6]">
                            {formatDateTime(step.time)}
                          </p>
                        )}
                        <p className="mt-1.5 text-xs leading-5 text-[#44506A]">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-6">
              <h2 className="inline-flex items-center gap-2 text-sm font-bold text-[#0B1C30]">
                <FileText size={16} className="text-[#0F52BA]" />
                Thư giới thiệu (Cover letter)
              </h2>
              <div className="mt-3 rounded-xl border border-[#DCE9FF] bg-[#F8F9FF] px-4 py-4 text-sm leading-7 text-[#44506A] whitespace-pre-wrap">
                {item.coverLetter?.trim() ||
                  "Ứng viên không gửi thư giới thiệu cho đơn này."}
              </div>
            </section>

            <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-6">
              <h2 className="text-sm font-bold text-[#0B1C30]">
                Hỗ trợ quy trình tuyển dụng
              </h2>
              <p className="mt-1 text-xs text-[#68758B]">
                Liên hệ nhà tuyển dụng nếu cần làm rõ lịch phỏng vấn hoặc hồ sơ.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`mailto:hr@${item.job.company.name
                    .toLowerCase()
                    .replace(/\s+/g, "")}.demo`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] px-3 text-xs font-semibold text-[#0F52BA]"
                >
                  <Mail size={14} /> Email HR
                </a>
                <a
                  href="tel:19008899"
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] px-3 text-xs font-semibold text-[#0F52BA]"
                >
                  <Phone size={14} /> Hotline 1900 8899
                </a>
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-[#E8ECF4] bg-white p-5">
              <h2 className="text-sm font-bold text-[#0B1C30]">
                Bản lưu trữ hồ sơ theo đơn
              </h2>
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <FileText size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[#0B1C30]">
                    {fileName}
                  </p>
                  <p className="text-[11px] text-[#8793a6]">
                    Tải lên {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={item.cvUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-[#EFF4FF] text-xs font-semibold text-[#0F52BA]"
                >
                  <Eye size={14} /> Xem tệp CV
                </a>
                <a
                  href={item.cvUrl}
                  download
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-[#003C90] text-xs font-semibold text-white"
                >
                  <Download size={14} /> Tải xuống
                </a>
              </div>
              <p className="mt-3 inline-flex items-start gap-1.5 text-[11px] leading-4 text-[#68758B]">
                <Lock size={12} className="mt-0.5 shrink-0" />
                Tệp đã được đóng băng phiên bản và mã hóa an toàn theo đơn.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E8ECF4] bg-white">
              <div
                className="h-28 bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url(https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80)",
                }}
                role="img"
                aria-label="Trụ sở doanh nghiệp"
              />
              <div className="p-5">
                <p className="inline-flex items-center gap-1 text-sm font-bold text-[#0B1C30]">
                  {item.job.company.name}
                  {verified && (
                    <BadgeCheck size={15} className="text-[#006A61]" />
                  )}
                </p>
                <p className="mt-1 text-xs text-[#68758B]">
                  Quy mô:{" "}
                  {COMPANY_SIZE[item.job.company.name] || "Đang cập nhật"}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#44506A]">
                  {item.job.company.description ||
                    "Doanh nghiệp đang tuyển dụng trên Tuyển dụng nhanh."}
                </p>
                {item.job.company.website ? (
                  <a
                    href={item.job.company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F52BA]"
                  >
                    <Briefcase size={13} />
                    Trang thương hiệu nhà tuyển dụng
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#68758B]">
                    <Building2 size={13} />
                    {item.job.company.industry || "Doanh nghiệp"}
                  </span>
                )}
              </div>
            </div>

            <Link
              href={`/candidate/jobs/${item.job.id}`}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#DCE9FF] bg-white text-sm font-semibold text-[#0F52BA]"
            >
              <Send size={15} />
              Xem lại tin tuyển dụng
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
