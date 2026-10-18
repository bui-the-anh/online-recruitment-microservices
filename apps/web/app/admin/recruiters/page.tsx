"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Lock,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { companyInitials, logoColor } from "@/lib/format";

type VerificationStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | null;

type RecruiterItem = {
  id: string;
  code: string;
  email: string;
  fullName: string;
  phone: string | null;
  accountStatus: "ACTIVE" | "SUSPENDED";
  verificationStatus: VerificationStatus;
  createdAt: string;
  company: {
    id: string;
    name: string;
    industry: string | null;
    location: string | null;
    address: string | null;
    taxCode: string | null;
    contactPhone: string | null;
    verificationDetails: string | null;
  } | null;
};

type RecruitersResponse = {
  items: RecruiterItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: {
    total: number;
    pending: number;
    verified: number;
    suspended: number;
    createdThisWeek: number;
    cleanRate: number;
  };
};

const VERIFICATION_OPTIONS = [
  { value: "ALL", label: "Tất cả xác minh" },
  { value: "PENDING_VERIFICATION", label: "Chờ xác minh" },
  { value: "VERIFIED", label: "Đã xác minh" },
  { value: "REJECTED", label: "Từ chối" },
];

function verificationBadge(status: VerificationStatus, note?: string | null) {
  if (status === "VERIFIED") {
    return (
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F7F2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#006A61]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#006A61]" /> Verified
        </span>
        {note && (
          <p className="mt-1 text-[11px] text-[#68758B] line-clamp-2">{note}</p>
        )}
      </div>
    );
  }
  if (status === "PENDING_VERIFICATION") {
    return (
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#B54708]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#B54708]" />{" "}
          Pending_verification
        </span>
        <p className="mt-1 text-[11px] text-[#B54708]">
          {note || "Hồ sơ chờ duyệt"}
        </p>
      </div>
    );
  }
  if (status === "REJECTED") {
    return (
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FDECEC] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#B42318]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#B42318]" /> Rejected
        </span>
        <p className="mt-1 text-[11px] text-[#B42318]">
          {note || "Hồ sơ bị từ chối"}
        </p>
      </div>
    );
  }
  return <span className="text-xs text-[#8793a6]">—</span>;
}

function accountBadge(status: "ACTIVE" | "SUSPENDED", note?: string | null) {
  if (status === "SUSPENDED") {
    return (
      <div>
        <span className="inline-flex rounded-full bg-[#FDECEC] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#B42318]">
          Suspended
        </span>
        <p className="mt-1 text-[11px] text-[#B42318]">
          {note || "Cấm tạo tin / bị đình chỉ"}
        </p>
      </div>
    );
  }
  return (
    <div>
      <span className="inline-flex rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#003C90]">
        Active
      </span>
      <p className="mt-1 text-[11px] text-[#68758B]">Hoạt động bình thường</p>
    </div>
  );
}

export default function AdminRecruitersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [verification, setVerification] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<RecruitersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<RecruiterItem | null>(null);
  const [note, setNote] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          verification,
          sort: "newest",
        });
        if (search.trim()) params.set("search", search.trim());
        const response = await api.get<RecruitersResponse>(
          `/admin/recruiters?${params.toString()}`,
        );
        setData(response.data);
      } catch (requestError) {
        setError(formatApiError(requestError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, pageSize, verification, search],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const counts = data?.counts ?? {
    total: 0,
    pending: 0,
    verified: 0,
    suspended: 0,
    createdThisWeek: 0,
    cleanRate: 0,
  };

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const rangeLabel = useMemo(() => {
    if (!data || data.total === 0) return "Hiển thị 0 kết quả";
    const from = (data.page - 1) * data.pageSize + 1;
    const to = Math.min(data.page * data.pageSize, data.total);
    return `Hiển thị kết quả ${from} - ${to} trên ${data.total.toLocaleString("vi-VN")}`;
  }, [data]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function exportCsv() {
    if (!data?.items.length) return;
    const header = [
      "code",
      "fullName",
      "email",
      "phone",
      "company",
      "taxCode",
      "verification",
      "accountStatus",
      "createdAt",
    ];
    const rows = data.items.map((item) =>
      [
        item.code,
        item.fullName,
        item.email,
        item.phone || "",
        item.company?.name || "",
        item.company?.taxCode || "",
        item.verificationStatus || "",
        item.accountStatus,
        item.createdAt,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `recruiters-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function setVerificationStatus(status: "VERIFIED" | "REJECTED") {
    if (!selected) return;
    setActing(true);
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/recruiters/${selected.id}/verification`, {
        status,
        note:
          note.trim() ||
          (status === "VERIFIED"
            ? "Admin đã xác minh hồ sơ doanh nghiệp"
            : "GPKD/MST không hợp lệ"),
      });
      setMessage(
        status === "VERIFIED" ? "Đã xác minh recruiter." : "Đã từ chối xác minh.",
      );
      setSelected(null);
      setNote("");
      await load(true);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setActing(false);
    }
  }

  async function setAccountStatus(status: "ACTIVE" | "SUSPENDED") {
    if (!selected) return;
    setActing(true);
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/recruiters/${selected.id}/account-status`, {
        status,
      });
      setMessage(
        status === "SUSPENDED"
          ? "Đã đình chỉ tài khoản."
          : "Đã mở lại tài khoản.",
      );
      setSelected(null);
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
            Quản lý Nhà tuyển dụng
          </h1>
          <p className="mt-1 text-sm text-[#68758B]">
            Theo dõi xác minh hồ sơ, trạng thái tài khoản và xuất báo cáo danh sách.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!data?.items.length}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#DCE9FF] bg-white px-3 text-xs font-semibold text-[#003C90] disabled:opacity-50"
        >
          <Download size={14} /> Xuất báo cáo danh sách (CSV)
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => {
            setVerification("ALL");
            setPage(1);
          }}
          className={`rounded-2xl border-t-4 border-t-[#003C90] bg-white p-4 text-left shadow-sm ${
            verification === "ALL" ? "ring-1 ring-[#003C90]/20" : "border-[#E4EAF3]"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8793a6]">
              Tất cả tài khoản
            </p>
            <UserRound size={16} className="text-[#003C90]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#0B1C30]">
            {counts.total.toLocaleString("vi-VN")}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#0F52BA]">
            +{counts.createdThisWeek} tuần này
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setVerification("PENDING_VERIFICATION");
            setPage(1);
          }}
          className={`rounded-2xl border-t-4 border-t-[#B54708] bg-white p-4 text-left shadow-sm ${
            verification === "PENDING_VERIFICATION"
              ? "ring-1 ring-[#B54708]/20"
              : "border-[#E4EAF3]"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8793a6]">
              Chờ xác minh (A08)
            </p>
            <ShieldAlert size={16} className="text-[#B54708]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#0B1C30]">
            {counts.pending.toLocaleString("vi-VN")}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#B54708]">
            Ưu tiên xử lý
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setVerification("VERIFIED");
            setPage(1);
          }}
          className={`rounded-2xl border-t-4 border-t-[#006A61] bg-white p-4 text-left shadow-sm ${
            verification === "VERIFIED"
              ? "ring-1 ring-[#006A61]/20"
              : "border-[#E4EAF3]"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8793a6]">
              Đã xác minh danh tính
            </p>
            <ShieldCheck size={16} className="text-[#006A61]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#0B1C30]">
            {counts.verified.toLocaleString("vi-VN")}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#006A61]">
            {counts.cleanRate}% tỉ lệ sạch
          </p>
        </button>

        <div className="rounded-2xl border border-[#E4EAF3] border-t-4 border-t-[#B42318] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8793a6]">
              Đang bị đình chỉ (A09)
            </p>
            <Lock size={16} className="text-[#B42318]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#0B1C30]">
            {counts.suspended.toLocaleString("vi-VN")}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#B42318]">Cấm tạo tin</p>
        </div>
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
            placeholder="Tìm theo tên, email, công ty, MST..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#A0A8B8]"
          />
        </label>
        <select
          value={verification}
          onChange={(event) => {
            setVerification(event.target.value);
            setPage(1);
          }}
          className="h-11 rounded-xl border border-[#E4EAF3] bg-[#F8F9FF] px-3 text-sm text-[#0B1C30] lg:w-56"
        >
          {VERIFICATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#003C90] px-4 text-sm font-semibold text-white"
        >
          Tìm kiếm
        </button>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#DCE9FF] text-[#003C90] disabled:opacity-60"
          aria-label="Làm mới"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : undefined}
          />
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#003C90]">
          Khu vực: Toàn quốc
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#003C90]">
          Sắp xếp: Mới đăng ký gần nhất
        </span>
        <span className="ml-auto text-[11px] text-[#8793a6]">{rangeLabel}</span>
      </div>

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
                  <th className="px-4 py-3">Mã recruiter</th>
                  <th className="px-4 py-3">Đại diện &amp; liên hệ</th>
                  <th className="px-4 py-3">Doanh nghiệp &amp; MST</th>
                  <th className="px-4 py-3">Xác minh hồ sơ</th>
                  <th className="px-4 py-3">Trạng thái TK</th>
                  <th className="px-4 py-3">Ngày đăng ký</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((item) => (
                  <tr key={item.id} className="border-t border-[#E4EAF3]">
                    <td className="px-4 py-3 align-top">
                      <p className="font-bold text-[#003C90]">{item.code}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${logoColor(item.fullName)}`}
                        >
                          {companyInitials(item.fullName)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0B1C30]">
                            {item.fullName}
                          </p>
                          <p className="text-[11px] text-[#68758B]">
                            {item.email}
                          </p>
                          <p className="text-[11px] text-[#8793a6]">
                            {item.phone || "Chưa có SĐT"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-[#0B1C30]">
                        {item.company?.name || "Chưa tạo công ty"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#68758B]">
                        MST: {item.company?.taxCode || "—"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8793a6]">
                        {item.company?.address ||
                          item.company?.location ||
                          "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {verificationBadge(
                        item.verificationStatus,
                        item.company?.verificationDetails,
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {accountBadge(
                        item.accountStatus,
                        item.accountStatus === "SUSPENDED"
                          ? item.company?.verificationDetails
                          : null,
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs text-[#44506A]">
                        {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8793a6]">
                        {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Link
                          href={`/admin/recruiters/${item.id}`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E4EAF3] px-2 text-[11px] font-semibold text-[#003C90]"
                        >
                          <Eye size={13} /> Chi tiết
                        </Link>
                        {item.verificationStatus ===
                          "PENDING_VERIFICATION" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(item);
                              setNote("");
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#003C90] text-white"
                            aria-label="Xác minh"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {item.accountStatus === "ACTIVE" &&
                          item.verificationStatus === "VERIFIED" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(item);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#FDECEC] text-[#B42318]"
                              aria-label="Đình chỉ"
                            >
                              <Lock size={14} />
                            </button>
                          )}
                        {item.verificationStatus === "REJECTED" && (
                          <a
                            href={`mailto:${item.email}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4EAF3] text-[#68758B]"
                            aria-label="Email"
                          >
                            <Mail size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(data?.items.length ?? 0) === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-[#8793a6]"
                    >
                      Không có recruiter phù hợp bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4EAF3] px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-[#68758B]">
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-8 rounded-lg border border-[#E4EAF3] bg-white px-2 text-xs"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size} dòng / trang
                </option>
              ))}
            </select>
            <span>
              trong tổng số {(data?.total ?? 0).toLocaleString("vi-VN")} bản ghi
            </span>
          </div>
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
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8793a6]">
                  Chi tiết recruiter
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#0B1C30]">
                  {selected.fullName}
                </h2>
                <p className="mt-1 text-xs text-[#68758B]">
                  {selected.code} · {selected.email}
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

            <div className="mt-4 space-y-2 rounded-xl bg-[#F8F9FF] p-3 text-xs text-[#44506A]">
              <p>
                Công ty:{" "}
                <span className="font-semibold text-[#0B1C30]">
                  {selected.company?.name || "—"}
                </span>
              </p>
              <p>MST: {selected.company?.taxCode || "—"}</p>
              <p>SĐT: {selected.phone || "—"}</p>
              <p>
                Địa chỉ:{" "}
                {selected.company?.address ||
                  selected.company?.location ||
                  "—"}
              </p>
              <p>
                Ghi chú hồ sơ: {selected.company?.verificationDetails || "—"}
              </p>
            </div>

            {(selected.verificationStatus === "PENDING_VERIFICATION" ||
              selected.verificationStatus === "REJECTED") && (
              <label className="mt-4 block text-xs">
                <span className="font-semibold text-[#68758B]">
                  Ghi chú xác minh / từ chối
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-[#E4EAF3] bg-[#F8F9FF] px-3 py-2 text-sm outline-none"
                  placeholder="Nhập ghi chú..."
                />
              </label>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-10 rounded-xl px-3 text-xs font-semibold text-[#68758B]"
              >
                Đóng
              </button>
              {selected.verificationStatus === "PENDING_VERIFICATION" && (
                <>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void setVerificationStatus("REJECTED")}
                    className="h-10 rounded-xl border border-[#F5C2C0] bg-[#FDECEC] px-3 text-xs font-semibold text-[#B42318] disabled:opacity-60"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void setVerificationStatus("VERIFIED")}
                    className="h-10 rounded-xl bg-[#003C90] px-3 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {acting ? "Đang xử lý..." : "Xác minh"}
                  </button>
                </>
              )}
              {selected.accountStatus === "ACTIVE" &&
                selected.verificationStatus === "VERIFIED" && (
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void setAccountStatus("SUSPENDED")}
                    className="h-10 rounded-xl bg-[#B42318] px-3 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {acting ? "Đang đình chỉ..." : "Đình chỉ tài khoản"}
                  </button>
                )}
              {selected.accountStatus === "SUSPENDED" && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void setAccountStatus("ACTIVE")}
                  className="h-10 rounded-xl bg-[#006A61] px-3 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {acting ? "Đang mở..." : "Mở lại tài khoản"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
