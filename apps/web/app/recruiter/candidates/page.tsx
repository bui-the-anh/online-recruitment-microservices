"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  UserRound,
  XCircle,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { formatSalaryRange, workModeLabel } from "@/lib/format";

type AppStatus =
  | "APPLIED"
  | "VIEWED"
  | "INTERVIEW"
  | "ACCEPTED"
  | "REJECTED";

type CandidateProfile = {
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
  bio?: string | null;
  experienceYears?: number | string | null;
  level?: string | null;
  expectedSalaryMin?: number | string | null;
  expectedSalaryMax?: number | string | null;
  workPreference?: string | null;
  skills?: string[] | null;
};

type ApplicationItem = {
  id: string;
  status: AppStatus;
  cvUrl: string;
  coverLetter: string | null;
  createdAt: string;
  updatedAt: string;
  interviewScheduledAt: string | null;
  interviewDetails: string | null;
  matchScore: number;
  job: {
    id: string;
    title: string;
    location?: string;
    workMode?: string;
  };
  candidate: {
    id: string;
    fullName: string;
    email: string;
    candidateProfile: CandidateProfile | null;
  };
};

type ListResponse = {
  items: ApplicationItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: {
    total: number;
    applied: number;
    viewed: number;
    interview: number;
    accepted: number;
    rejected: number;
  };
  jobs: Array<{
    id: string;
    title: string;
    status: string;
    applicants: number;
  }>;
};

const STATUS_TABS: Array<{
  value: string;
  label: string;
  countKey: keyof ListResponse["counts"];
}> = [
  { value: "ALL", label: "Tất cả", countKey: "total" },
  { value: "APPLIED", label: "Đã nộp", countKey: "applied" },
  { value: "VIEWED", label: "Đã xem", countKey: "viewed" },
  { value: "INTERVIEW", label: "Phỏng vấn", countKey: "interview" },
  { value: "ACCEPTED", label: "Chấp thuận", countKey: "accepted" },
  { value: "REJECTED", label: "Từ chối", countKey: "rejected" },
];

const PIPELINE: AppStatus[] = [
  "VIEWED",
  "INTERVIEW",
  "ACCEPTED",
  "REJECTED",
];

function statusLabel(status: AppStatus): string {
  const map: Record<AppStatus, string> = {
    APPLIED: "ĐÃ NỘP",
    VIEWED: "ĐÃ XEM",
    INTERVIEW: "ĐANG PHỎNG VẤN",
    ACCEPTED: "CHẤP THUẬN",
    REJECTED: "TỪ CHỐI",
  };
  return map[status];
}

function statusTone(status: AppStatus): string {
  if (status === "INTERVIEW") return "bg-[#EFF4FF] text-[#003C90]";
  if (status === "ACCEPTED") return "bg-[#E6F7F2] text-[#006A61]";
  if (status === "REJECTED") return "bg-[#FDECEC] text-[#B42318]";
  if (status === "VIEWED") return "bg-[#F1F3F7] text-[#44506A]";
  return "bg-[#FFF4E5] text-[#B54708]";
}

function relativeStamp(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.toDateString() === now.toDateString();
  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  if (sameDay) return `${time}, Hôm nay`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `${time}, Hôm qua`;
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function experienceText(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n} năm`;
}

export default function RecruiterCandidatesPage() {
  const searchParams = useSearchParams();
  const [jobsReady, setJobsReady] = useState(false);
  const [jobId, setJobId] = useState(searchParams.get("jobId") ?? "");
  const [status, setStatus] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApplicationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "4",
        status,
      });
      if (jobId) params.set("jobId", jobId);
      if (search.trim()) params.set("search", search.trim());
      const response = await api.get<ListResponse>(
        `/applications?${params.toString()}`,
      );
      setData(response.data);
      if (!jobsReady && response.data.jobs.length > 0 && !jobId) {
        const preferred =
          response.data.jobs.find((job) =>
            job.title.toLowerCase().includes("frontend"),
          ) ?? response.data.jobs[0];
        setJobId(preferred.id);
        setJobsReady(true);
        return;
      }
      setJobsReady(true);
      const firstId = response.data.items[0]?.id ?? null;
      setSelectedId((prev) => {
        if (prev && response.data.items.some((item) => item.id === prev)) {
          return prev;
        }
        return firstId;
      });
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [page, status, search, jobId, jobsReady]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    async function loadDetail() {
      setDetailLoading(true);
      try {
        const response = await api.get<ApplicationItem>(
          `/applications/${selectedId}`,
        );
        if (!cancelled) {
          setDetail(response.data);
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              items: prev.items.map((item) =>
                item.id === response.data.id
                  ? { ...item, status: response.data.status, matchScore: response.data.matchScore }
                  : item,
              ),
            };
          });
        }
      } catch (requestError) {
        if (!cancelled) setError(formatApiError(requestError));
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const counts = data?.counts ?? {
    total: 0,
    applied: 0,
    viewed: 0,
    interview: 0,
    accepted: 0,
    rejected: 0,
  };
  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const selectedJob = data?.jobs.find((job) => job.id === jobId);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function changeStatus(
    next: AppStatus,
    extra?: { interviewScheduledAt?: string; interviewDetails?: string },
  ) {
    if (!detail) return;
    setActing(true);
    setError("");
    setMessage("");
    try {
      await api.patch(`/applications/${detail.id}/status`, {
        status: next,
        ...extra,
      });
      setMessage(
        next === "INTERVIEW"
          ? "Đã chuyển sang vòng phỏng vấn."
          : next === "ACCEPTED"
            ? "Đã chấp thuận ứng viên."
            : next === "REJECTED"
              ? "Đã từ chối hồ sơ."
              : "Đã cập nhật trạng thái.",
      );
      const refreshed = await api.get<ApplicationItem>(
        `/applications/${detail.id}`,
      );
      setDetail(refreshed.data);
      await load();
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setActing(false);
    }
  }

  async function movePipeline(target: AppStatus) {
    if (!detail) return;
    if (target === detail.status) return;
    if (target === "REJECTED") {
      if (!window.confirm(`Từ chối hồ sơ của ${detail.candidate.fullName}?`)) {
        return;
      }
      await changeStatus("REJECTED");
      return;
    }
    if (target === "INTERVIEW") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 30, 0, 0);
      await changeStatus("INTERVIEW", {
        interviewScheduledAt: tomorrow.toISOString(),
        interviewDetails: "Vòng kỹ thuật · Google Meet · 10:30",
      });
      return;
    }
    if (target === "ACCEPTED") {
      await changeStatus("ACCEPTED");
      return;
    }
    if (target === "VIEWED" && detail.status === "APPLIED") {
      await changeStatus("VIEWED");
    }
  }

  const profile = detail?.candidate.candidateProfile;
  const skills = Array.isArray(profile?.skills) ? profile!.skills! : [];

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1C30]">
            Quản lý ứng viên
          </h1>
          <p className="mt-1 text-sm text-[#68758B]">
            Pipeline xét duyệt theo từng chiến dịch tuyển dụng.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={jobId}
            onChange={(event) => {
              setJobId(event.target.value);
              setPage(1);
              setSelectedId(null);
            }}
            className="h-10 min-w-[260px] rounded-xl border border-[#D7E0EE] bg-white px-3 text-sm font-medium text-[#0B1C30] outline-none focus:border-[#003C90]"
          >
            <option value="">Tất cả chiến dịch</option>
            {(data?.jobs ?? []).map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} ({job.applicants})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#D7E0EE] bg-white px-3 text-xs font-semibold text-[#0B1C30]"
          >
            <Download size={14} /> Xuất báo cáo pipeline
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="flex min-h-[640px] flex-col overflow-hidden rounded-2xl border border-[#E4EAF3] bg-white">
          <div className="space-y-3 border-b border-[#E4EAF3] p-4">
            <div className="flex flex-wrap gap-1">
              {STATUS_TABS.map((tab) => {
                const active = status === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setStatus(tab.value);
                      setPage(1);
                    }}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      active
                        ? "bg-[#003C90] text-white"
                        : "bg-[#F1F3F7] text-[#68758B] hover:bg-[#E4EAF3]"
                    }`}
                  >
                    {tab.label} ({counts[tab.countKey]})
                  </button>
                );
              })}
            </div>
            <form onSubmit={handleSearch} className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8793a6]"
              />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tìm tên, kỹ năng, headline..."
                className="h-10 w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] pl-9 pr-3 text-sm outline-none focus:border-[#003C90]"
              />
            </form>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {loading && (
              <p className="px-2 py-8 text-center text-sm text-[#68758B]">
                Đang tải hồ sơ...
              </p>
            )}
            {!loading && (data?.items.length ?? 0) === 0 && (
              <p className="rounded-xl border border-dashed border-[#E4EAF3] px-3 py-10 text-center text-sm text-[#8793a6]">
                Chưa có ứng viên cho bộ lọc này.{" "}
                <Link
                  href="/recruiter/jobs"
                  className="font-semibold text-[#003C90]"
                >
                  Xem tin tuyển dụng
                </Link>
              </p>
            )}
            {!loading &&
              (data?.items ?? []).map((item) => {
                const active = item.id === selectedId;
                const itemProfile = item.candidate.candidateProfile;
                const stack = Array.isArray(itemProfile?.skills)
                  ? itemProfile!.skills!.slice(0, 3).join(" · ")
                  : itemProfile?.headline ?? "";
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-[#003C90] bg-[#F5F8FF] shadow-sm"
                        : "border-[#E4EAF3] bg-white hover:border-[#C5D0E2]"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#003C90] text-xs font-bold text-white">
                        {initials(item.candidate.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-bold text-[#0B1C30]">
                            {item.candidate.fullName}
                          </p>
                          <span className="shrink-0 rounded-full bg-[#E6F7F2] px-2 py-0.5 text-[10px] font-bold text-[#006A61]">
                            {item.matchScore}% Match
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-[#68758B]">
                          {experienceText(itemProfile?.experienceYears)} ·{" "}
                          {stack || "—"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone(item.status)}`}
                          >
                            {item.status} · {statusLabel(item.status)}
                          </span>
                          <span className="text-[10px] text-[#8793a6]">
                            {relativeStamp(
                              item.interviewScheduledAt ?? item.updatedAt,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>

          <div className="flex items-center justify-between border-t border-[#E4EAF3] px-3 py-2.5 text-[11px] text-[#68758B]">
            <span>
              Hiển thị{" "}
              {data && data.total > 0
                ? `${(data.page - 1) * data.pageSize + 1} - ${Math.min(
                    data.page * data.pageSize,
                    data.total,
                  )}`
                : "0"}{" "}
              / {data?.total ?? 0} ứng viên
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#D7E0EE] disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#D7E0EE] disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>

        <section className="min-h-[640px] overflow-hidden rounded-2xl border border-[#E4EAF3] bg-white">
          {!detail && !detailLoading && (
            <div className="flex h-full min-h-[640px] flex-col items-center justify-center px-6 text-center">
              <UserRound size={36} className="text-[#C5D0E2]" />
              <p className="mt-3 text-sm font-semibold text-[#0B1C30]">
                Chọn một hồ sơ để xem chi tiết
              </p>
              <p className="mt-1 max-w-sm text-xs text-[#8793a6]">
                Pipeline, CV, thư giới thiệu và đánh giá phù hợp sẽ hiện bên
                phải.
              </p>
            </div>
          )}
          {detailLoading && (
            <p className="px-6 py-16 text-center text-sm text-[#68758B]">
              Đang tải chi tiết hồ sơ...
            </p>
          )}
          {detail && !detailLoading && (
            <div className="flex h-full flex-col">
              <div className="border-b border-[#E4EAF3] px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#003C90] text-base font-bold text-white">
                      {initials(detail.candidate.fullName)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold text-[#0B1C30]">
                          {detail.candidate.fullName}
                        </h2>
                        {detail.matchScore >= 90 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-bold text-[#B54708]">
                            <Star size={10} /> Featured Candidate
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[#68758B]">
                        {profile?.headline || "Ứng viên"}
                        {selectedJob ? ` · ${selectedJob.title}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#68758B]">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} />
                          {profile?.location ||
                            profile?.workPreference ||
                            "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Mail size={12} />
                          {detail.candidate.email}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusTone(detail.status)}`}
                  >
                    {detail.matchScore}% Match · {statusLabel(detail.status)}
                  </span>
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8793a6]">
                    Quy trình xét duyệt
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {PIPELINE.map((step) => {
                      const order = ["APPLIED", ...PIPELINE];
                      const currentIdx = order.indexOf(detail.status);
                      const stepIdx = order.indexOf(step);
                      const done =
                        detail.status !== "REJECTED" && stepIdx <= currentIdx;
                      const isReject = step === "REJECTED";
                      const active = detail.status === step;
                      return (
                        <button
                          key={step}
                          type="button"
                          disabled={acting || detail.status === "ACCEPTED" || (detail.status === "REJECTED" && !isReject)}
                          onClick={() => void movePipeline(step)}
                          className={`rounded-xl border px-2 py-2.5 text-center transition disabled:opacity-50 ${
                            active
                              ? isReject
                                ? "border-[#B42318] bg-[#FDECEC]"
                                : "border-[#003C90] bg-[#EFF4FF]"
                              : done && !isReject
                                ? "border-[#B7E4D8] bg-[#E6F7F2]"
                                : "border-[#E4EAF3] bg-[#F7F9FC]"
                          }`}
                        >
                          <p
                            className={`text-[10px] font-bold ${
                              active
                                ? isReject
                                  ? "text-[#B42318]"
                                  : "text-[#003C90]"
                                : "text-[#68758B]"
                            }`}
                          >
                            {step === "VIEWED"
                              ? "Đã xem"
                              : step === "INTERVIEW"
                                ? "Phỏng vấn"
                                : step === "ACCEPTED"
                                  ? "Chấp thuận"
                                  : "Từ chối"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detail.status === "VIEWED" && (
                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => void movePipeline("INTERVIEW")}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#003C90] px-3 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Mời phỏng vấn
                      </button>
                    )}
                    {detail.status === "INTERVIEW" && (
                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => void movePipeline("ACCEPTED")}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#006A61] px-3 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        <CheckCircle2 size={14} /> Chấp thuận
                      </button>
                    )}
                    {detail.status !== "REJECTED" &&
                      detail.status !== "ACCEPTED" && (
                        <button
                          type="button"
                          disabled={acting}
                          onClick={() => void movePipeline("REJECTED")}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#F3C1BD] bg-white px-3 text-xs font-semibold text-[#B42318] disabled:opacity-60"
                        >
                          <XCircle size={14} /> Từ chối
                        </button>
                      )}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div className="rounded-xl border border-[#E4EAF3] bg-[#F7F9FC] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#B42318]">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0B1C30]">
                          {detail.cvUrl.split("/").pop() || "CV ứng viên.pdf"}
                        </p>
                        <p className="text-[11px] text-[#8793a6]">
                          PDF · Đã quét an toàn
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={detail.cvUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#D7E0EE] bg-white px-3 text-xs font-semibold text-[#0B1C30]"
                      >
                        <Eye size={14} /> Xem CV
                      </a>
                      <a
                        href={detail.cvUrl}
                        download
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#003C90] px-3 text-xs font-semibold text-white"
                      >
                        <Download size={14} /> Tải xuống
                      </a>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#0B1C30]">
                    Thư giới thiệu
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl border border-[#E4EAF3] bg-white p-4 text-sm leading-relaxed text-[#44506A]">
                    {detail.coverLetter || "Ứng viên chưa gửi thư giới thiệu."}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#0B1C30]">
                    Năng lực & mức phù hợp
                  </h3>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    <Metric
                      label="Kinh nghiệm"
                      value={experienceText(profile?.experienceYears)}
                    />
                    <Metric
                      label="Thế mạnh"
                      value={
                        profile?.headline?.split(/[|/·-]/)[0]?.trim() ||
                        skills[0] ||
                        "—"
                      }
                    />
                    <Metric
                      label="Mức lương kỳ vọng"
                      value={formatSalaryRange(
                        profile?.expectedSalaryMin,
                        profile?.expectedSalaryMax,
                      )}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[#006A61]" />
                    <h3 className="text-sm font-bold text-[#0B1C30]">
                      Kỹ năng đã xác nhận
                    </h3>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skills.length === 0 && (
                      <span className="text-xs text-[#8793a6]">
                        Chưa cập nhật kỹ năng trên hồ sơ.
                      </span>
                    )}
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#003C90]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {detail.interviewDetails && (
                  <div className="rounded-xl border border-[#C5D6F5] bg-[#F5F8FF] p-4 text-sm text-[#003C90]">
                    <p className="text-xs font-bold uppercase tracking-wide">
                      Lịch phỏng vấn
                    </p>
                    <p className="mt-1">{detail.interviewDetails}</p>
                    {detail.interviewScheduledAt && (
                      <p className="mt-1 text-xs text-[#68758B]">
                        {new Intl.DateTimeFormat("vi-VN", {
                          dateStyle: "full",
                          timeStyle: "short",
                        }).format(new Date(detail.interviewScheduledAt))}
                      </p>
                    )}
                  </div>
                )}

                {profile?.bio && (
                  <div>
                    <h3 className="text-sm font-bold text-[#0B1C30]">
                      Tóm tắt hồ sơ
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#44506A]">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {detail.job.workMode && (
                  <p className="text-xs text-[#8793a6]">
                    Tin: {detail.job.title} · {detail.job.location} ·{" "}
                    {workModeLabel(detail.job.workMode)}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E4EAF3] bg-[#F7F9FC] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8793a6]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-[#0B1C30]">{value}</p>
    </div>
  );
}
