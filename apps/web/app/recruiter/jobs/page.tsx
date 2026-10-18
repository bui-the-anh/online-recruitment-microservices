"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  Megaphone,
  PauseCircle,
  Pencil,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import {
  employmentTypeLabel,
  formatSalaryRange,
  workModeLabel,
} from "@/lib/format";

type JobStatus = "PENDING" | "APPROVED" | "REJECTED" | "CLOSED";

type RecruiterJob = {
  id: string;
  code: string;
  title: string;
  description: string;
  location: string;
  category: string | null;
  status: JobStatus;
  employmentType: string;
  workMode: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  createdAt: string;
  publishedAt: string | null;
  expiresAt: string | null;
  rejectionNote: string | null;
  applicants: number;
  company: { id: string; name: string };
};

type JobsResponse = {
  items: RecruiterJob[];
  total: number;
  page: number;
  pageSize: number;
  counts: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    closed: number;
  };
  applicationsTotal: number;
  avgApprovalHours: number;
  firstPassRate: number;
  categories: string[];
};

type CreateForm = {
  title: string;
  description: string;
  requirements: string;
  location: string;
  category: string;
  employmentType: string;
  workMode: string;
  salaryMin: string;
  salaryMax: string;
  experienceMin: string;
  experienceMax: string;
  expiresAt: string;
};

const EMPTY_FORM: CreateForm = {
  title: "",
  description: "",
  requirements: "",
  location: "",
  category: "",
  employmentType: "FULL_TIME",
  workMode: "HYBRID",
  salaryMin: "",
  salaryMax: "",
  experienceMin: "",
  experienceMax: "",
  expiresAt: "",
};

const TABS: Array<{
  value: string;
  label: string;
  countKey: keyof JobsResponse["counts"];
}> = [
  { value: "ALL", label: "Tất cả tin", countKey: "total" },
  { value: "APPROVED", label: "Đang mở tuyển", countKey: "approved" },
  { value: "PENDING", label: "Chờ Admin duyệt", countKey: "pending" },
  { value: "REJECTED", label: "Bị từ chối", countKey: "rejected" },
  { value: "CLOSED", label: "Đã đóng", countKey: "closed" },
];

function relativeTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function statusMeta(status: JobStatus) {
  if (status === "APPROVED") {
    return {
      label: "APPROVED",
      className: "bg-[#E6F7F2] text-[#006A61]",
      hint: "Hiển thị công khai",
    };
  }
  if (status === "PENDING") {
    return {
      label: "PENDING",
      className: "bg-[#FFF4E5] text-[#B54708]",
      hint: "Hàng đợi kiểm duyệt",
    };
  }
  if (status === "REJECTED") {
    return {
      label: "REJECTED",
      className: "bg-[#FDECEC] text-[#B42318]",
      hint: "Bị Admin từ chối",
    };
  }
  return {
    label: "CLOSED",
    className: "bg-[#F1F3F7] text-[#68758B]",
    hint: "Đã đóng tin",
  };
}

export default function RecruiterJobsPage() {
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(
    () => searchParams.get("status")?.toUpperCase() || "ALL",
  );
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [editJob, setEditJob] = useState<RecruiterJob | null>(null);

  useEffect(() => {
    const next = searchParams.get("status")?.toUpperCase();
    if (next && next !== status) {
      setStatus(next);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "4",
        status,
        sort,
      });
      if (search.trim()) params.set("search", search.trim());
      if (category) params.set("category", category);
      const response = await api.get<JobsResponse>(
        `/recruiter/jobs?${params.toString()}`,
      );
      setData(response.data);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [page, status, search, category, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = data?.counts ?? {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    closed: 0,
  };
  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function closeJob(job: RecruiterJob) {
    if (!window.confirm(`Đóng tin "${job.title}"? Tin sẽ không còn hiển thị công khai.`)) {
      return;
    }
    setActingId(job.id);
    setMessage("");
    setError("");
    try {
      await api.patch(`/jobs/${job.id}`, { status: "CLOSED" });
      setMessage("Đã đóng tin tuyển dụng.");
      await load();
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setActingId(null);
    }
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        requirements: createForm.requirements.trim() || undefined,
        location: createForm.location.trim(),
        category: createForm.category.trim() || undefined,
        employmentType: createForm.employmentType,
        workMode: createForm.workMode,
        salaryMin: createForm.salaryMin
          ? Number(createForm.salaryMin)
          : undefined,
        salaryMax: createForm.salaryMax
          ? Number(createForm.salaryMax)
          : undefined,
        experienceMin: createForm.experienceMin
          ? Number(createForm.experienceMin)
          : undefined,
        experienceMax: createForm.experienceMax
          ? Number(createForm.experienceMax)
          : undefined,
        expiresAt: createForm.expiresAt || undefined,
        currency: "VND",
      };
      if (!editJob) {
        throw new Error("Không tìm thấy tin cần chỉnh sửa");
      }
      await api.patch(`/jobs/${editJob.id}`, payload);
      setMessage("Đã gửi lại tin để Admin kiểm duyệt.");
      setShowCreate(false);
      setEditJob(null);
      setCreateForm(EMPTY_FORM);
      setStatus("PENDING");
      setPage(1);
      await load();
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setCreating(false);
    }
  }

  function openEdit(job: RecruiterJob) {
    setEditJob(job);
    setCreateForm({
      title: job.title,
      description: job.description,
      requirements: "",
      location: job.location,
      category: job.category ?? "",
      employmentType: job.employmentType,
      workMode: job.workMode,
      salaryMin: job.salaryMin != null ? String(job.salaryMin) : "",
      salaryMax: job.salaryMax != null ? String(job.salaryMax) : "",
      experienceMin: "",
      experienceMax: "",
      expiresAt: job.expiresAt
        ? new Date(job.expiresAt).toISOString().slice(0, 10)
        : "",
    });
    setShowCreate(true);
  }

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1C30]">
            Quản lý tin tuyển dụng
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[#68758B]">
            Theo dõi trạng thái kiểm duyệt, hiệu suất chiến dịch và chỉnh sửa tin
            trước khi Admin phê duyệt.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#D7E0EE] bg-white px-3 text-xs font-semibold text-[#0B1C30]"
          >
            <Download size={14} /> Xuất báo cáo
          </button>
          <Link
            href="/recruiter/jobs/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#003C90] px-3 text-xs font-semibold text-white shadow-sm shadow-[#003C90]/20"
          >
            <Plus size={14} /> Đăng tin tuyển dụng mới
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Megaphone size={16} className="text-[#006A61]" />}
          iconBg="bg-[#E6F7F2]"
          label="Tổng vị trí chiến dịch"
          value={String(counts.total)}
        />
        <KpiCard
          icon={<Users size={16} className="text-[#003C90]" />}
          iconBg="bg-[#EFF4FF]"
          label="Tổng hồ sơ ứng tuyển"
          value={String(data?.applicationsTotal ?? 0)}
        />
        <KpiCard
          icon={<Clock3 size={16} className="text-[#B54708]" />}
          iconBg="bg-[#FFF4E5]"
          label="SLA Duyệt trung bình"
          value={`${data?.avgApprovalHours ?? 1.8}h`}
        />
        <KpiCard
          icon={<AlertTriangle size={16} className="text-[#B42318]" />}
          iconBg="bg-[#FDECEC]"
          label="Yêu cầu cần chỉnh sửa"
          value={`${counts.rejected} tin`}
        />
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

      <div className="mt-6 overflow-x-auto">
        <div className="inline-flex min-w-full gap-1 rounded-2xl border border-[#E4EAF3] bg-white p-1">
          {TABS.map((tab) => {
            const active = status === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setStatus(tab.value);
                  setPage(1);
                }}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-[#EFF4FF] text-[#003C90]"
                    : "text-[#68758B] hover:bg-[#F7F9FC]"
                }`}
              >
                {tab.label} ({counts[tab.countKey]})
              </button>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-4 grid gap-2 rounded-2xl border border-[#E4EAF3] bg-white p-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
      >
        <label className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8793a6]"
          />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm theo vị trí, địa điểm..."
            className="h-10 w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] pl-9 pr-3 text-sm outline-none focus:border-[#003C90]"
          />
        </label>
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 text-sm outline-none focus:border-[#003C90]"
        >
          <option value="">Mọi ngành / nhóm</option>
          {(data?.categories ?? []).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 text-sm outline-none focus:border-[#003C90]"
        >
          <option value="newest">Sắp xếp: Mới nhất đăng tải</option>
          <option value="oldest">Sắp xếp: Cũ nhất</option>
          <option value="salary">Sắp xếp: Lương cao → thấp</option>
        </select>
        <div className="flex h-10 items-center rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 text-xs text-[#68758B]">
          Lọc theo trạng thái tab phía trên
        </div>
        <button
          type="submit"
          className="h-10 rounded-xl bg-[#0B1C30] px-4 text-xs font-semibold text-white"
        >
          Áp dụng
        </button>
      </form>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#E4EAF3] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left">
            <thead className="border-b border-[#E4EAF3] bg-[#F7F9FC] text-[11px] font-semibold uppercase tracking-wide text-[#8793a6]">
              <tr>
                <th className="px-4 py-3">Thông tin vị trí & mã Job</th>
                <th className="px-4 py-3">Mức lương & đãi ngộ</th>
                <th className="px-4 py-3">Lịch trình đăng tin</th>
                <th className="px-4 py-3">Ứng viên</th>
                <th className="px-4 py-3">Trạng thái duyệt</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-[#68758B]"
                  >
                    Đang tải danh sách tin...
                  </td>
                </tr>
              )}
              {!loading && (data?.items.length ?? 0) === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-[#8793a6]"
                  >
                    Chưa có tin phù hợp bộ lọc.{" "}
                    <Link
                      href="/recruiter/jobs/new"
                      className="font-semibold text-[#003C90]"
                    >
                      Đăng tin mới
                    </Link>
                  </td>
                </tr>
              )}
              {!loading &&
                (data?.items ?? []).map((job) => {
                  const meta = statusMeta(job.status);
                  return (
                    <tr
                      key={job.id}
                      className="border-b border-[#EEF2F7] last:border-0"
                    >
                      <td className="px-4 py-4 align-top">
                        <div className="flex gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF4FF] text-[#003C90]">
                            <BriefcaseBusiness size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#0B1C30]">
                              {job.title}
                            </p>
                            <p className="mt-0.5 text-[11px] font-medium text-[#8793a6]">
                              {job.code}
                            </p>
                            <p className="mt-1 text-xs text-[#68758B]">
                              {job.location} · {workModeLabel(job.workMode)} ·{" "}
                              {employmentTypeLabel(job.employmentType)}
                            </p>
                            {job.category && (
                              <p className="mt-1 text-[11px] text-[#003C90]">
                                {job.category}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-semibold text-[#0B1C30]">
                          {formatSalaryRange(
                            job.salaryMin,
                            job.salaryMax,
                            job.currency,
                          )}
                        </p>
                        {job.status === "REJECTED" && (
                          <p className="mt-1 text-[11px] font-medium text-[#B42318]">
                            {job.rejectionNote || "Cần chỉnh sửa theo phản hồi Admin"}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-xs text-[#68758B]">
                        <p>Tạo: {formatDate(job.createdAt)}</p>
                        <p className="mt-1">
                          Đăng: {formatDate(job.publishedAt)}
                        </p>
                        <p className="mt-1">
                          Hết hạn: {formatDate(job.expiresAt)}
                        </p>
                        {job.status === "PENDING" && (
                          <p className="mt-1 font-medium text-[#B54708]">
                            Đang tính SLA {data?.avgApprovalHours ?? 1.8}h
                          </p>
                        )}
                        {job.status === "REJECTED" && (
                          <p className="mt-1 font-medium text-[#B42318]">
                            Từ chối {relativeTime(job.createdAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-bold text-[#0B1C30]">
                          {job.applicants}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#8793a6]">
                          hồ sơ
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                        <p className="mt-1.5 text-[11px] text-[#68758B]">
                          {meta.hint}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center justify-end gap-1.5">
                          {job.status === "APPROVED" && (
                            <>
                              <IconAction
                                href={`/recruiter/candidates?jobId=${job.id}`}
                                title="Quản lý ứng viên"
                              >
                                <Users size={14} />
                              </IconAction>
                              <IconAction
                                href={`/candidate/jobs/${job.id}`}
                                title="Xem công khai"
                              >
                                <Eye size={14} />
                              </IconAction>
                              <button
                                type="button"
                                title="Đóng / tạm dừng tin"
                                disabled={actingId === job.id}
                                onClick={() => void closeJob(job)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D7E0EE] text-[#B54708] hover:bg-[#FFF4E5] disabled:opacity-50"
                              >
                                <PauseCircle size={14} />
                              </button>
                            </>
                          )}
                          {(job.status === "PENDING" ||
                            job.status === "REJECTED") && (
                            <button
                              type="button"
                              title="Chỉnh sửa & gửi lại duyệt"
                              onClick={() => openEdit(job)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D7E0EE] text-[#003C90] hover:bg-[#EFF4FF]"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {job.status === "CLOSED" && (
                            <IconAction
                              href={`/recruiter/candidates?jobId=${job.id}`}
                              title="Xem ứng viên"
                            >
                              <Users size={14} />
                            </IconAction>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4EAF3] px-4 py-3">
          <div className="flex flex-wrap gap-4 text-[11px] text-[#68758B]">
            <span>
              Thời gian duyệt Admin TB:{" "}
              <strong className="text-[#0B1C30]">
                {data?.avgApprovalHours ?? 1.8} giờ
              </strong>
            </span>
            <span>
              Tỷ lệ duyệt vòng 1:{" "}
              <strong className="text-[#0B1C30]">
                {data?.firstPassRate ?? 92.4}%
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#68758B]">
            <span>
              Hiển thị{" "}
              {data && data.total > 0
                ? `${(data.page - 1) * data.pageSize + 1} - ${Math.min(
                    data.page * data.pageSize,
                    data.total,
                  )}`
                : "0"}{" "}
              trên tổng số {data?.total ?? 0} tin
            </span>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D7E0EE] disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(3, totalPages) }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${
                    page === pageNumber
                      ? "bg-[#003C90] text-white"
                      : "border border-[#D7E0EE] text-[#0B1C30]"
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D7E0EE] disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1C30]/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4EAF3] px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#0B1C30]">
                  {editJob ? "Chỉnh sửa tin tuyển dụng" : "Đăng tin tuyển dụng mới"}
                </h2>
                <p className="mt-0.5 text-xs text-[#68758B]">
                  Tin sẽ vào hàng chờ Admin duyệt sau khi gửi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setEditJob(null);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D7E0EE]"
              >
                <X size={14} />
              </button>
            </div>
            <form onSubmit={submitCreate} className="space-y-3 px-5 py-4">
              <Field label="Tiêu đề vị trí *">
                <input
                  required
                  value={createForm.title}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 text-sm outline-none focus:border-[#003C90]"
                  placeholder="VD: Senior Frontend Engineer"
                />
              </Field>
              <Field label="Mô tả công việc *">
                <textarea
                  required
                  rows={4}
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 py-2.5 text-sm outline-none focus:border-[#003C90]"
                  placeholder="Mô tả trách nhiệm, môi trường..."
                />
              </Field>
              <Field label="Yêu cầu ứng viên">
                <textarea
                  rows={3}
                  value={createForm.requirements}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      requirements: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 py-2.5 text-sm outline-none focus:border-[#003C90]"
                  placeholder="Kỹ năng, kinh nghiệm..."
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Địa điểm *">
                  <input
                    required
                    value={createForm.location}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        location: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 text-sm outline-none focus:border-[#003C90]"
                    placeholder="Hà Nội / TP.HCM..."
                  />
                </Field>
                <Field label="Nhóm / ngành">
                  <input
                    value={createForm.category}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        category: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 text-sm outline-none focus:border-[#003C90]"
                    placeholder="Engineering & AI"
                  />
                </Field>
                <Field label="Hình thức hợp đồng">
                  <select
                    value={createForm.employmentType}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        employmentType: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 text-sm outline-none focus:border-[#003C90]"
                  >
                    <option value="FULL_TIME">Full-time</option>
                    <option value="PART_TIME">Part-time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                </Field>
                <Field label="Hình thức làm việc">
                  <select
                    value={createForm.workMode}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        workMode: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 text-sm outline-none focus:border-[#003C90]"
                  >
                    <option value="ONSITE">Onsite</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                </Field>
                <Field label="Lương tối thiểu (VND)">
                  <input
                    type="number"
                    min={0}
                    value={createForm.salaryMin}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        salaryMin: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 text-sm outline-none focus:border-[#003C90]"
                  />
                </Field>
                <Field label="Lương tối đa (VND)">
                  <input
                    type="number"
                    min={0}
                    value={createForm.salaryMax}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        salaryMax: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 text-sm outline-none focus:border-[#003C90]"
                  />
                </Field>
                <Field label="Kinh nghiệm tối thiểu (năm)">
                  <input
                    type="number"
                    min={0}
                    value={createForm.experienceMin}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        experienceMin: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 text-sm outline-none focus:border-[#003C90]"
                  />
                </Field>
                <Field label="Ngày hết hạn">
                  <input
                    type="date"
                    value={createForm.expiresAt}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        expiresAt: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 text-sm outline-none focus:border-[#003C90]"
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-2 border-t border-[#E4EAF3] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setEditJob(null);
                  }}
                  className="h-10 rounded-xl border border-[#D7E0EE] px-4 text-xs font-semibold text-[#0B1C30]"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="h-10 rounded-xl bg-[#003C90] px-4 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {creating
                    ? "Đang gửi..."
                    : editJob
                      ? "Lưu & gửi duyệt lại"
                      : "Gửi tin chờ duyệt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function KpiCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-[#E4EAF3] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8793a6]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-[#0B1C30]">{value}</p>
        </div>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-[#0B1C30]">{label}</span>
      {children}
    </label>
  );
}

function IconAction({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={title}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D7E0EE] text-[#0B1C30] hover:bg-[#F7F9FC]"
    >
      {children}
    </Link>
  );
}
