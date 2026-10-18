"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  LogOut,
  Network,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";

export type CandidateUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export type CandidateProfile = {
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
};

const NAV = [
  { href: "/candidate", label: "Trang chủ", exact: true },
  { href: "/candidate/companies", label: "Công ty nổi bật" },
  { href: "/candidate/applications", label: "Việc làm đã nộp" },
];

export function CandidateShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CandidateUser | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const me = await api.get<CandidateUser>("/auth/me");
        if (cancelled) return;
        if (me.data.role !== "CANDIDATE") {
          router.replace("/");
          return;
        }
        setUser(me.data);
        const [profileRes, notifRes] = await Promise.all([
          api.get<CandidateProfile>("/candidate/profile").catch(() => null),
          api
            .get<Array<{ readAt: string | null }>>("/notifications")
            .catch(() => null),
        ]);
        if (cancelled) return;
        if (profileRes) setProfile(profileRes.data);
        if (notifRes) {
          setUnread(notifRes.data.filter((item) => !item.readAt).length);
        }
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
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FF] text-sm text-[#68758B]">
        Đang tải trang ứng viên...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FF] px-4 text-sm text-red-600">
        {error || "Phiên đăng nhập không hợp lệ."}
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
    <div className="min-h-screen bg-[#F8F9FF] text-[#0B1C30]">
      <header className="sticky top-0 z-30 border-b border-[#E8ECF4] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/candidate"
            className="inline-flex shrink-0 items-center gap-2.5"
            aria-label="Tuyển dụng nhanh"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003C90] text-white">
              <BriefcaseBusiness aria-hidden="true" size={18} />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#003C90]">
              Tuyển dụng nhanh
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-[#EFF4FF] text-[#003C90]"
                      : "text-[#68758B] hover:bg-[#F8F9FF] hover:text-[#0B1C30]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-[#68758B] transition hover:bg-[#EFF4FF] hover:text-[#003C90] sm:inline-flex"
              aria-label="Việc đã lưu"
            >
              <Bookmark aria-hidden="true" size={18} />
            </button>
            <button
              type="button"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#68758B] transition hover:bg-[#EFF4FF] hover:text-[#003C90]"
              aria-label="Thông báo"
            >
              <Bell aria-hidden="true" size={18} />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>

            <Link
              href="/candidate/profile"
              className="flex items-center gap-2.5 rounded-full border border-[#E8ECF4] bg-white py-1 pl-1 pr-3 transition hover:border-[#DCE9FF] hover:bg-[#F8F9FF]"
              aria-label="Hồ sơ cá nhân"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#DCE9FF] text-xs font-bold text-[#003C90]">
                {initials || <Network size={16} />}
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#006A61]" />
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold leading-tight text-[#0B1C30]">
                  {user.fullName}
                </p>
                <p className="truncate text-[11px] text-[#68758B]">
                  {profile?.headline || "Ứng viên"}
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#68758B] transition hover:bg-red-50 hover:text-red-600"
              aria-label="Đăng xuất"
            >
              <LogOut aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
