"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, formatApiError } from "@/lib/api";

type User = {
  id: string;
  email: string;
  fullName: string;
  role: "CANDIDATE" | "RECRUITER" | "ADMIN";
};

type AuthResponse = {
  user: User;
};

const roleLabels: Record<User["role"], string> = {
  CANDIDATE: "Ứng viên",
  RECRUITER: "Nhà tuyển dụng",
  ADMIN: "Quản trị viên",
};

const benefits = [
  {
    icon: BriefcaseBusiness,
    title: "Cơ hội phù hợp",
    description: "Khám phá những công việc dành riêng cho hành trình của bạn.",
  },
  {
    icon: Users,
    title: "Kết nối trực tiếp",
    description: "Gặp gỡ nhà tuyển dụng và doanh nghiệp uy tín.",
  },
  {
    icon: ShieldCheck,
    title: "Theo dõi dễ dàng",
    description: "Cập nhật trạng thái hồ sơ ứng tuyển ngay trong tài khoản.",
  },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post<AuthResponse>("/auth/login", {
        email: email.trim(),
        password,
      });
      setUser(response.data.user);
      setPassword("");
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setError("");
    setIsLoggingOut(true);

    try {
      await api.post("/auth/logout");
      setUser(null);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#172033]">
      <header className="h-16 border-b border-[#e9edf5] bg-white/90">
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6 lg:px-8">
          <a href="/" className="inline-flex items-center gap-2.5" aria-label="CareerLink trang chủ">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f52ba] text-white shadow-sm">
              <BriefcaseBusiness aria-hidden="true" size={19} strokeWidth={2.2} />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#14294c]">
              Career<span className="text-[#0f52ba]">Link</span>
            </span>
          </a>
          <p className="text-sm text-[#68758b]">
            Chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#0f52ba] hover:text-[#0c469f]"
            >
              Tạo tài khoản
            </Link>
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.78fr_1.12fr] lg:gap-12 lg:px-8 lg:py-8">
        <section className="relative isolate hidden min-h-[680px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#103d83] via-[#0f52ba] to-[#123b7e] p-10 text-white shadow-[0_24px_70px_-32px_rgba(15,82,186,0.6)] lg:flex lg:flex-col xl:min-h-[824px] xl:p-10">
          <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-80 w-80 rounded-full bg-[#89f5e7]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-24 -z-10 h-72 w-72 rounded-full bg-[#b0c6ff]/20 blur-3xl" />

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold tracking-wide text-white/90 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#89f5e7]" />
            NỀN TẢNG KẾT NỐI NGHỀ NGHIỆP
          </div>

          <div className="mt-14 max-w-md">
            <p className="text-sm font-medium text-[#b9d5ff]">
              Chào mừng bạn đến với CareerLink
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.16] tracking-tight xl:text-[44px]">
              Cơ hội mới,
              <br />
              hành trình mới
              <span className="text-[#89f5e7]">.</span>
            </h1>
            <p className="mt-5 max-w-sm text-[15px] leading-7 text-blue-100/85">
              Tìm công việc phù hợp, kết nối với nhà tuyển dụng và tiến gần hơn
              tới mục tiêu nghề nghiệp của bạn.
            </p>
          </div>

          <div className="mt-10 space-y-3">
            {benefits.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex min-h-[76px] items-center gap-4 rounded-xl border border-white/10 bg-white/[0.09] px-4 py-3 backdrop-blur-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#a8f5e8]">
                  <Icon aria-hidden="true" size={19} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">{title}</h2>
                  <p className="mt-1 text-xs leading-5 text-blue-100/75">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-xl border border-white/15 bg-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#89f5e7] text-[#103d83]">
                <Sparkles aria-hidden="true" size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold">Sẵn sàng cho bước tiếp theo?</p>
                <p className="mt-1 text-xs text-blue-100/75">
                  Cơ hội phù hợp có thể bắt đầu từ hôm nay.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[620px] items-center justify-center rounded-2xl border border-[#edf0f6] bg-white px-6 py-10 shadow-[0_16px_50px_-36px_rgba(25,43,77,0.35)] sm:px-10 lg:min-h-[582px] lg:self-start lg:px-10 xl:px-12">
          <div className="w-full max-w-[480px]">
            {user ? (
              <div className="py-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#0f52ba]">
                  <Check aria-hidden="true" size={27} strokeWidth={2.5} />
                </div>
                <p className="mt-7 text-sm font-semibold text-[#0f52ba]">
                  Đăng nhập thành công
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#172033]">
                  Xin chào, {user.fullName}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#68758b]">
                  Bạn đã đăng nhập với vai trò {roleLabels[user.role]}. Phiên
                  đăng nhập được bảo vệ bằng cookie an toàn.
                </p>
                <div className="mt-8 rounded-xl border border-[#e8edf5] bg-[#f8faff] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7c8799]">
                    Tài khoản
                  </p>
                  <p className="mt-1.5 break-all text-sm font-medium text-[#25334b]">
                    {user.email}
                  </p>
                  <p className="mt-2 text-sm text-[#68758b]">
                    {roleLabels[user.role]}
                  </p>
                </div>
                {error && (
                  <p
                    className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-7 w-full border-[#dce3ef] text-[#25334b] hover:border-[#b8c9e5]"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <LoaderCircle className="mr-2 animate-spin" size={18} />
                  ) : null}
                  {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#eff4ff] px-3 py-1.5 text-xs font-semibold text-[#0f52ba]">
                    <ShieldCheck aria-hidden="true" size={15} />
                    ĐĂNG NHẬP AN TOÀN
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight text-[#172033] sm:text-[34px]">
                    Chào mừng trở lại
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#68758b]">
                    Đăng nhập để tiếp tục hành trình nghề nghiệp của bạn.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-[#303c50]"
                    >
                      Email
                    </label>
                    <div className="relative">
                      <Mail
                        aria-hidden="true"
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#98a3b4]"
                        size={18}
                      />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={320}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="ten@email.com"
                        className="h-12 w-full rounded-lg border border-[#dfe5ef] bg-[#f8f9fc] pl-11 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a9b7] focus:border-[#0f52ba] focus:bg-white focus:ring-4 focus:ring-[#0f52ba]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-[#303c50]"
                      >
                        Mật khẩu
                      </label>
                    </div>
                    <div className="relative">
                      <LockKeyhole
                        aria-hidden="true"
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#98a3b4]"
                        size={18}
                      />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Nhập mật khẩu của bạn"
                        className="h-12 w-full rounded-lg border border-[#dfe5ef] bg-[#f8f9fc] pl-11 pr-12 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a9b7] focus:border-[#0f52ba] focus:bg-white focus:ring-4 focus:ring-[#0f52ba]/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[#8591a4] transition hover:bg-[#edf2fa] hover:text-[#34445e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f52ba]"
                        aria-label={
                          showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                        }
                        aria-pressed={showPassword}
                      >
                        {showPassword ? (
                          <EyeOff aria-hidden="true" size={18} />
                        ) : (
                          <Eye aria-hidden="true" size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-lg bg-[#0f52ba] text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(15,82,186,0.7)] hover:bg-[#0c469f] focus-visible:ring-[#0f52ba]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle
                          aria-hidden="true"
                          className="mr-2 animate-spin"
                          size={18}
                        />
                        Đang đăng nhập...
                      </>
                    ) : (
                      <>
                        Đăng nhập
                        <ArrowRight
                          aria-hidden="true"
                          className="ml-2"
                          size={18}
                        />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-7 flex items-start gap-3 rounded-lg bg-[#eff4ff] px-4 py-3.5">
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[#0f52ba]"
                    size={18}
                  />
                  <p className="text-xs leading-5 text-[#5b6b84]">
                    Thông tin đăng nhập được bảo vệ. Phiên của bạn sử dụng
                    cookie bảo mật và không lưu token trong trình duyệt.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
