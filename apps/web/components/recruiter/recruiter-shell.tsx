"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";

export type RecruiterUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  verificationStatus?: string | null;
};

type CompanyBrief = {
  name?: string | null;
};

const NAV = [
  {
    href: "/recruiter",
    label: "Bảng điều khiển",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/recruiter/jobs",
    label: "Tin tuyển dụng",
    icon: BriefcaseBusiness,
  },
  {
    href: "/recruiter/candidates",
    label: "Quản lý ứng viên",
    icon: Users,
  },
  {
    href: "/recruiter/company",
    label: "Hồ sơ công ty",
    icon: Building2,
  },
  {
    href: "/recruiter/settings",
    label: "Cài đặt hệ thống",
    icon: Settings,
  },
];

export function RecruiterShell({
  children,
  unread = 0,
}: {
  children: React.ReactNode;
  unread?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<RecruiterUser | null>(null);
  const [company, setCompany] = useState<CompanyBrief | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const me = await api.get<RecruiterUser>("/auth/me");
        if (cancelled) return;
        if (me.data.role !== "RECRUITER") {
          router.replace("/");
          return;
        }
        setUser(me.data);
        const companyRes = await api
          .get<CompanyBrief>("/companies/me")
          .catch(() => null);
        if (!cancelled && companyRes) setCompany(companyRes.data);
      } catch (requestError) {
        if (!cancelled) {
          setError(formatApiError(requestError));
          router.replace("/");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    router.replace("/");
  }

  if (loading) {
    return (
      <p className="px-4 py-16 text-center text-sm text-[#68758B]">
        Đang tải cổng nhà tuyển dụng...
      </p>
    );
  }

  if (!user) {
    return (
      <div className="px-4 py-16 text-center text-sm text-red-600">
        {error || "Không thể xác thực nhà tuyển dụng."}
      </div>
    );
  }

  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#0B1C30]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-[#E4EAF3] bg-white lg:flex lg:flex-col">
          <div className="border-b border-[#E4EAF3] px-5 py-5">
            <div className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#003C90] text-white">
                <BriefcaseBusiness size={18} />
              </span>
              <div>
                <p className="text-sm font-bold tracking-tight text-[#003C90]">
                  TalentHub
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8793a6]">
                  Recruiter Portal
                </p>
              </div>
            </div>
          </div>
          <nav className="mt-4 space-y-1 px-3">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-[#003C90] text-white"
                      : "text-[#44506A] hover:bg-[#F8F9FF]"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-[#E4EAF3] p-4">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E4EAF3] px-3 py-2.5 text-sm font-semibold text-[#68758B] hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[#E4EAF3] bg-white/95 backdrop-blur">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <div className="flex items-center gap-2 lg:hidden">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#003C90] text-white">
                  <Building2 size={14} />
                </span>
                <span className="text-sm font-bold text-[#003C90]">
                  Recruiter
                </span>
              </div>
              <label className="mx-auto hidden w-full max-w-xl items-center gap-2 rounded-full border border-[#E4EAF3] bg-[#F8F9FF] px-4 py-2 sm:flex">
                <Search size={15} className="text-[#A0A8B8]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm hồ sơ, chiến dịch hoặc vị trí..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#A0A8B8]"
                />
              </label>
              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#68758B] hover:bg-[#EFF4FF]"
                  aria-label="Thông báo"
                >
                  <Bell size={18} />
                  {unread > 0 && (
                    <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2.5 rounded-full border border-[#E4EAF3] bg-white py-1 pl-1 pr-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#003C90] text-xs font-bold text-white">
                    {initials || "HR"}
                  </span>
                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate text-sm font-semibold leading-tight">
                      {user.fullName}
                    </p>
                    <p className="truncate text-[11px] text-[#68758B]">
                      {company?.name || "HR Lead"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto border-t border-[#E4EAF3] px-3 py-2 lg:hidden">
              {NAV.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      active
                        ? "bg-[#003C90] text-white"
                        : "text-[#68758B]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
