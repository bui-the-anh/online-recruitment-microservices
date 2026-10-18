"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Hourglass,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { formatSalaryRange } from "@/lib/format";

type JobStatus = "PENDING" | "APPROVED" | "REJECTED" | "CLOSED";

type AdminJob = {
  id: string;
  code: string;
  title: string;
  description: string;
  location: string;
  status: JobStatus;
  createdAt: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  companyVerified: boolean;
  missingLicense: boolean;
  rejectionNote: string | null;
  company: {
    id: string;
    name: string;
    industry: string | null;
    location: string | null;
    verificationDetails: string | null;
  };
  recruiter: {
    id: string;
    fullName: string;
    email: string;
    verificationStatus: string | null;
  };
};

type AdminJobsResponse = {
  items: AdminJob[];
  total: number;
  page: number;
  pageSize: number;
  counts: {
    pending: number;
    approved: number;
    rejected: number;
    closed: number;
    total: number;
  };
};

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã phê duyệt" },
  { value: "REJECTED", label: "Đã từ chối" },
  { value: "CLOSED", label: "Đã khoá" },
  { value: "ALL", label: "Tất cả" },
];

const DAYS_OPTIONS = [
  { value: "", label: "Mọi thời gian" },
  { value: "3", label: "3 ngày gần nhất" },
  { value: "7", label: "7 ngày gần nhất" },
  { value: "30", label: "30 ngày gần nhất" },
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

function statusBadge(status: JobStatus) {
  const map: Record<
    JobStatus,
    { label: string; className: string; dot: string }
  > = {
    PENDING: {
      label: "PENDING",
      className: "bg-[#EFF4FF] text-[#003C90]",
      dot: "bg-[#003C90]",
    },
    APPROVED: {
      label: "APPROVED",
      className: "bg-[#E6F7F2] text-[#006A61]",
      dot: "bg-[#006A61]",
    },
    REJECTED: {
      label: "REJECTED",
      className: "bg-[#FDECEC] text-[#B42318]",
      dot: "bg-[#B42318]",
    },
    CLOSED: {
      label: "LOCKED",
      className: "bg-[#FFF4E5] text-[#B54708]",
      dot: "bg-[#B54708]",
    },
  };
  const item = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${item.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  );
}

export default function AdminJobsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [days, setDays] = useState("3");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminJobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<AdminJob | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "4",
          status,
        });
        if (search.trim()) params.set("search", search.trim());
        if (days) params.set("days", days);
        const response = await api.get<AdminJobsResponse>(
          `/admin/jobs?${params.toString()}`,
        );
        setData(response.data);
      } catch (requestError) {
        setError(formatApiError(requestError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, status, search, days],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const counts = data?.counts ?? {
    pending: 0,
    approved: 0,
    rejected: 0,
    closed: 0,
    total: 0,
  };

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; clear: () => void }> =
      [];
    if (status !== "ALL") {
      filters.push({
        key: "status",
        label: `Status: ${status}`,
        clear: () => {
          setStatus("ALL");
          setPage(1);
        },
      });
    }
    if (days) {
      filters.push({
        key: "days",
        label: `Thời gian: ${days} ngày qua`,
        clear: () => {
          setDays("");
          setPage(1);
        },
      });
    }
    if (search) {
      filters.push({
        key: "search",
        label: `Từ khóa: ${search}`,
        clear: () => {
          setSearch("");
          setSearchInput("");
          setPage(1);
        },
      });
    }
    return filters;
  }, [status, days, search]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function clearFilters() {
    setStatus("ALL");
    setDays("");
    setSearch("");
    setSearchInput("");
    setPage(1);
  }

  async function review(next: "APPROVED" | "REJECTED" | "CLOSED") {
    if (!selected) return;
    setActing(true);
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/jobs/${selected.id}/review`, {
        status: next,
        rejectionNote:
          next === "REJECTED"
            ? rejectNote.trim() ||
              "Không đủ thông tin / không phù hợp chính sách."
            : undefined,
      });
      setMessage(
        next === "APPROVED"
          ? "Đã phê duyệt tin."
          : next === "REJECTED"
            ? "Đã từ chối tin."
            : "Đã khoá tin.",
      );
      setSelected(null);
      setRejectNote("");
      await load(true);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setActing(false);
    }
  }

  const pageNumbers = useMemo(() => {
    const max = Math.min(totalPages, 7);
    return Array.from({ length: max }, (_, index) => index + 1);
  }, [totalPages]);

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1C30]">
            Kiểm duyệt tin tuyển dụng
          </h1>
          <p className="mt-1 text-sm text-[#68758B]">
            Thẩm định tin đăng theo trạng thái, doanh nghiệp và thời điểm gửi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#003C90] px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin" : undefined}
          />
          Làm mới
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Chờ duyệt",
            value: counts.pending,
            icon: Hourglass,
            tone: "bg-[#EFF4FF] text-[#003C90]",
            active: status === "PENDING",
            onClick: () => {
              setStatus("PENDING");
              setPage(1);
            },
          },
          {
            label: "Đã phê duyệt",
            value: counts.approved,
            icon: CheckCircle2,
            tone: "bg-[#E6F7F2] text-[#006A61]",
            active: status === "APPROVED",
            onClick: () => {
              setStatus("APPROVED");
              setPage(1);
            },
          },
          {
            label: "Đã từ chối",
            value: counts.rejected,
            icon: XCircle,
            tone: "bg-[#FDECEC] text-[#B42318]",
            active: status === "REJECTED",
            onClick: () => {
              setStatus("REJECTED");
              setPage(1);
            },
          },
          {
            label: "Đã khoá",
            value: counts.closed,
            icon: Ban,
            tone: "bg-[#FFF4E5] text-[#B54708]",
            active: status === "CLOSED",
            onClick: () => {
              setStatus("CLOSED");
              setPage(1);
            },
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                card.active
                  ? "border-[#003C90] ring-1 ring-[#003C90]/20"
                  : "border-[#E4EAF3] hover:border-[#DCE9FF]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#68758B]">
                  {card.label}
                </p>
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${card.tone}`}
                >
                  <Icon size={15} />
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-[#0B1C30]">
                {card.value.toLocaleString("vi-VN")}
              </p>
            </button>
          );
        })}
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-5 flex flex-col gap-2 rounded-2xl border border-[#E4EAF3] bg-white p-3 shadow-sm lg:flex-row lg:items-center"
      >
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#E4EAF3] bg-[#F8F9FF] px-3 py-2.5">
          <Search size={15} className="text-[#A0A8B8]" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm theo tiêu đề, công ty, người đăng..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#A0A8B8]"
          />
        </label>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="h-11 rounded-xl border border-[#E4EAF3] bg-[#F8F9FF] px-3 text-sm text-[#0B1C30] lg:w-44"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={days}
          onChange={(event) => {
            setDays(event.target.value);
            setPage(1);
          }}
          className="h-11 rounded-xl border border-[#E4EAF3] bg-[#F8F9FF] px-3 text-sm text-[#0B1C30] lg:w-48"
        >
          {DAYS_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#003C90] px-4 text-sm font-semibold text-white"
        >
          Áp dụng
        </button>
      </form>

      {activeFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={filter.clear}
              className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#003C90]"
            >
              {filter.label} <X size={12} />
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="text-[11px] font-semibold text-[#68758B] hover:text-[#003C90]"
          >
            Xóa tất cả bộ lọc
          </button>
          <span className="ml-auto text-[11px] text-[#8793a6]">
            Hiển thị {data?.items.length ?? 0} / {data?.total ?? 0} tin phù hợp
          </span>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#E4EAF3] bg-white shadow-sm">
        {loading ? (
          <p className="px-4 py-10 text-sm text-[#68758B]">Đang tải danh sách...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#F8F9FF] text-[10px] font-bold uppercase tracking-[0.12em] text-[#8793a6]">
                <tr>
                  <th className="px-4 py-3">Tiêu đề</th>
                  <th className="px-4 py-3">Doanh nghiệp</th>
                  <th className="px-4 py-3">Người đăng</th>
                  <th className="px-4 py-3">Thời điểm gửi</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((job) => (
                  <tr key={job.id} className="border-t border-[#E4EAF3]">
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-[#0B1C30]">{job.title}</p>
                      <p className="mt-0.5 text-[11px] text-[#8793a6]">
                        {job.code} · {job.location}
                      </p>
                      <p className="mt-1 text-[11px] text-[#68758B]">
                        {formatSalaryRange(
                          job.salaryMin,
                          job.salaryMax,
                          job.currency,
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-[#0B1C30]">
                        {job.company.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8793a6]">
                        {job.company.industry || "Doanh nghiệp"}
                      </p>
                      {job.missingLicense && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#B54708]">
                          <AlertTriangle size={12} /> Chưa nộp GPKD
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-[#0B1C30]">
                        {job.recruiter.fullName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8793a6]">
                        {job.recruiter.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs text-[#44506A]">
                        {new Date(job.createdAt).toLocaleString("vi-VN")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8793a6]">
                        {relativeTime(job.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {statusBadge(job.status)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        {job.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(job);
                              setRejectNote("");
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#003C90] px-3 text-xs font-semibold text-white"
                          >
                            <Gavel size={13} /> Thẩm định
                          </button>
                        )}
                        {job.missingLicense && job.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(job);
                              setRejectNote(
                                "Doanh nghiệp chưa nộp/đủ giấy phép kinh doanh.",
                              );
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#FFDBCA] bg-[#FFF4E5] px-3 text-xs font-semibold text-[#B54708]"
                          >
                            <AlertTriangle size={13} /> Cảnh báo duyệt
                          </button>
                        )}
                        {job.status === "APPROVED" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(job);
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#FFDBCA] bg-[#FFF4E5] px-3 text-xs font-semibold text-[#B54708]"
                          >
                            <Ban size={13} /> Khoá tin
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(data?.items.length ?? 0) === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-sm text-[#8793a6]"
                    >
                      Không có tin phù hợp bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4EAF3] px-4 py-3">
          <p className="text-xs text-[#68758B]">
            Hiển thị trang {data?.page ?? 1} trên {totalPages} (Tổng số{" "}
            {data?.total ?? 0} mục)
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4EAF3] text-[#68758B] disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            {pageNumbers.map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold ${
                  page === number
                    ? "bg-[#003C90] text-white"
                    : "border border-[#E4EAF3] text-[#44506A]"
                }`}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4EAF3] text-[#68758B] disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1C30]/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8793a6]">
                  Thẩm định tin
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#0B1C30]">
                  {selected.title}
                </h2>
                <p className="mt-1 text-xs text-[#68758B]">
                  {selected.code} · {selected.company.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full p-1.5 text-[#8793a6] hover:bg-[#F8F9FF]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-[#44506A]">
              <p className="rounded-xl bg-[#F8F9FF] p-3 text-xs leading-relaxed">
                {selected.description.slice(0, 280)}
                {selected.description.length > 280 ? "…" : ""}
              </p>
              <p className="text-xs">
                Người đăng:{" "}
                <span className="font-semibold text-[#0B1C30]">
                  {selected.recruiter.fullName}
                </span>{" "}
                ({selected.recruiter.email})
              </p>
              {selected.missingLicense && (
                <p className="inline-flex items-center gap-1 rounded-xl bg-[#FFF4E5] px-3 py-2 text-xs font-semibold text-[#B54708]">
                  <AlertTriangle size={14} /> Doanh nghiệp chưa nộp/đủ GPKD
                </p>
              )}
              {selected.status === "PENDING" && (
                <label className="block text-xs">
                  <span className="font-semibold text-[#68758B]">
                    Lý do từ chối (nếu reject)
                  </span>
                  <textarea
                    value={rejectNote}
                    onChange={(event) => setRejectNote(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-[#E4EAF3] bg-[#F8F9FF] px-3 py-2 text-sm outline-none"
                    placeholder="Nhập lý do từ chối..."
                  />
                </label>
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-10 rounded-xl px-3 text-xs font-semibold text-[#68758B]"
              >
                Đóng
              </button>
              {selected.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void review("REJECTED")}
                    className="inline-flex h-10 items-center rounded-xl border border-[#F5C2C0] bg-[#FDECEC] px-3 text-xs font-semibold text-[#B42318] disabled:opacity-60"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void review("APPROVED")}
                    className="inline-flex h-10 items-center rounded-xl bg-[#003C90] px-3 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {acting ? "Đang xử lý..." : "Phê duyệt"}
                  </button>
                </>
              )}
              {selected.status === "APPROVED" && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void review("CLOSED")}
                  className="inline-flex h-10 items-center rounded-xl bg-[#B54708] px-3 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {acting ? "Đang khoá..." : "Xác nhận khoá tin"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
