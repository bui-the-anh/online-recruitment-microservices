"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckSquare,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Network,
  ShieldCheck,
  UserCog,
  UserRound,
  Zap,
} from "lucide-react";
import { api, formatApiError } from "../lib/api";

type RoleTab = "candidate" | "recruiter" | "admin";

type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

const ROLE_TABS: Array<{
  id: RoleTab;
  label: string;
  hint: string;
  icon: typeof UserRound;
}> = [
  { id: "candidate", label: "Ứng viên", hint: "Tìm việc & CV", icon: UserRound },
  { id: "recruiter", label: "Nhà tuyển dụng", hint: "Đăng tin", icon: Building2 },
  { id: "admin", label: "Quản trị viên", hint: "Vận hành", icon: UserCog },
];

const FEATURES = [
  {
    title: "Xác thực doanh nghiệp",
    description: "Kiểm chứng giấy phép kinh doanh & mã số thuế trước khi đăng tin.",
    icon: CheckSquare,
    iconBg: "bg-[#89F5E7]",
    iconColor: "text-[#00201D]",
  },
  {
    title: "Bảo mật hồ sơ đa lớp",
    description: "Mã hóa CV theo chuẩn enterprise, chỉ mở khi ứng viên đồng ý.",
    icon: ShieldCheck,
    iconBg: "bg-white",
    iconColor: "text-[#003C90]",
  },
  {
    title: "Microservices Real-time",
    description: "Đồng bộ dữ liệu tuyển dụng & lịch phỏng vấn tức thì qua Kafka.",
    icon: Zap,
    iconBg: "bg-[#FFDBCA]",
    iconColor: "text-[#341100]",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [roleTab, setRoleTab] = useState<RoleTab>("candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post<{ user: AuthUser }>("/auth/login", {
        email,
        password,
      });
      const loggedInUser = response.data.user;
      if (!loggedInUser?.role) {
        throw new Error("Phản hồi đăng nhập không hợp lệ.");
      }
      setUser(loggedInUser);
      setMessage(`Đăng nhập thành công với vai trò ${loggedInUser.role}`);
      if (loggedInUser.role === "CANDIDATE") {
        router.push("/candidate");
        return;
      }
      if (loggedInUser.role === "ADMIN") {
        router.push("/admin");
        return;
      }
      if (loggedInUser.role === "RECRUITER") {
        router.push("/recruiter");
        return;
      }
      setError("Vai trò tài khoản chưa được hỗ trợ trên giao diện này.");
    } catch (err: unknown) {
      setError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    setUser(null);
    setMessage("");
    setError("");
    setPassword("");
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#0B1C30]">
      <header className="border-b border-[#E8ECF4] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Tuyển dụng nhanh">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003C90] text-white shadow-sm">
              <Network aria-hidden="true" size={18} />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#003C90]">
              Tuyển dụng nhanh
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.9fr_1.25fr] lg:items-stretch lg:gap-8 lg:px-8 lg:py-8">
        <aside className="relative isolate hidden overflow-hidden rounded-2xl bg-gradient-to-b from-[#003C90] via-[#0F52BA] to-[#006A61] p-8 text-white shadow-[0_24px_60px_-28px_rgba(0,60,144,0.55)] lg:flex lg:flex-col xl:p-10">
          <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-80 w-80 rounded-full bg-[#89F5E7]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 -z-10 h-72 w-72 rounded-full bg-[#B0C6FF]/15 blur-3xl" />

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-[#89F5E7] backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[#89F5E7]" />
            Hệ sinh thái Tuyển dụng Kỹ thuật số 4.0
          </div>

          <h1 className="mt-7 max-w-[22ch] text-[32px] font-bold leading-[1.2] tracking-tight xl:text-[36px]">
            Kết nối{" "}
            <span className="text-[#89F5E7]">Nhân tài Công nghệ</span>
            {" "}& Doanh nghiệp hàng đầu Việt Nam
          </h1>
          <p className="mt-4 max-w-[42ch] text-sm leading-6 text-[#BCCEFF]">
            Nền tảng tuyển dụng sử dụng kiến trúc phân tán Real-time, giúp quy
            trình tuyển dụng trở nên minh bạch và an toàn tuyệt đối.
          </p>

          <div className="mt-8 space-y-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="flex items-start gap-3.5 rounded-xl bg-white/10 px-4 py-3.5 backdrop-blur-[2px]"
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${feature.iconBg} shadow-sm`}
                  >
                    <Icon aria-hidden="true" size={18} className={feature.iconColor} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{feature.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-[#BCCEFF]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-8">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-white/10 px-4 py-3.5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  {["#89F5E7", "#B0C6FF", "#FFDBCA"].map((color) => (
                    <span
                      key={color}
                      className="h-9 w-9 rounded-full border-2 border-[#0F52BA]"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0F52BA] bg-[#89F5E7] text-[10px] font-bold text-[#003C90]">
                    +
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">50,000+ Cơ hội</p>
                  <p className="text-[11px] text-[#BCCEFF]">
                    Việc làm công nghệ được xác thực
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[#89F5E7]">1,200+</p>
                <p className="text-[11px] text-[#BCCEFF]">Doanh nghiệp kiểm chứng</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex items-center justify-center py-2 lg:py-0">
          <div className="w-full max-w-[560px] rounded-2xl bg-white p-6 shadow-[0_18px_50px_-28px_rgba(20,41,76,0.35)] sm:p-8 lg:p-10">
            {user ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#0B1C30] sm:text-[28px]">
                    Xin chào, {user.fullName}
                  </h2>
                  <p className="mt-2 text-sm text-[#68758b]">
                    Bạn đã đăng nhập với vai trò{" "}
                    <span className="font-semibold text-[#003C90]">{user.role}</span>.
                  </p>
                </div>

                {message ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {message}
                  </p>
                ) : null}

                <div className="rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] p-4 text-sm text-[#434653]">
                  <p>
                    <span className="font-medium text-[#0B1C30]">Email:</span>{" "}
                    {user.email}
                  </p>
                  <p className="mt-2">
                    <span className="font-medium text-[#0B1C30]">Họ tên:</span>{" "}
                    {user.fullName}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#003C90] text-sm font-semibold text-white transition hover:bg-[#0F52BA]"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-bold leading-snug tracking-tight text-[#0B1C30] sm:text-[28px]">
                    Chào mừng bạn trở lại với Tuyển dụng nhanh
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#68758b]">
                    Chọn vai trò làm việc để chuyển đổi luồng xác thực bảo mật
                    thích ứng.
                  </p>
                </div>

                <div
                  className="mt-6 grid grid-cols-3 gap-1.5 rounded-xl bg-[#EFF4FF] p-1.5"
                  role="tablist"
                  aria-label="Chọn vai trò đăng nhập"
                >
                  {ROLE_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = roleTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setRoleTab(tab.id)}
                        className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center transition ${
                          active
                            ? "bg-white text-[#003C90] shadow-sm"
                            : "text-[#68758b] hover:text-[#0B1C30]"
                        }`}
                      >
                        <Icon
                          aria-hidden="true"
                          size={18}
                          className={active ? "text-[#003C90]" : "text-[#737784]"}
                        />
                        <span className="text-[11px] font-semibold leading-tight sm:text-xs">
                          {tab.label}
                        </span>
                        <span className="hidden text-[10px] text-[#C3C6D5] sm:block">
                          {tab.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-[#0B1C30]"
                    >
                      Địa chỉ Email
                    </label>
                    <div className="relative">
                      <Mail
                        aria-hidden="true"
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737784]"
                      />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="vidu@email.com"
                        className="h-12 w-full rounded-xl border border-transparent bg-[#F8F9FF] py-2.5 pl-10 pr-3 text-sm text-[#0B1C30] outline-none transition placeholder:text-[#C3C6D5] focus:border-[#0F52BA]/40 focus:bg-white focus:ring-2 focus:ring-[#0F52BA]/15"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-[#0B1C30]"
                      >
                        Mật khẩu bảo vệ
                      </label>
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#0F52BA] hover:text-[#003C90]"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock
                        aria-hidden="true"
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737784]"
                      />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••••••"
                        className="h-12 w-full rounded-xl border border-transparent bg-[#F8F9FF] py-2.5 pl-10 pr-11 text-sm text-[#0B1C30] outline-none transition placeholder:text-[#C3C6D5] focus:border-[#0F52BA]/40 focus:bg-white focus:ring-2 focus:ring-[#0F52BA]/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#737784] transition hover:text-[#0B1C30]"
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? (
                          <EyeOff aria-hidden="true" size={16} />
                        ) : (
                          <Eye aria-hidden="true" size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#003C90] text-sm font-semibold text-white transition hover:bg-[#0F52BA] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                    {!isSubmitting ? (
                      <ArrowRight aria-hidden="true" size={16} />
                    ) : null}
                  </button>
                </form>

                <p className="mt-5 text-center text-sm text-[#68758b]">
                  Bạn chưa có tài khoản?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-[#0F52BA] hover:text-[#003C90]"
                  >
                    Đăng ký Ứng viên
                  </Link>
                  <span className="mx-1.5 text-[#C3C6D5]">•</span>
                  <Link
                    href="/register/recruiter"
                    className="font-semibold text-[#0F52BA] hover:text-[#003C90]"
                  >
                    Đăng ký Doanh nghiệp
                  </Link>
                </p>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
