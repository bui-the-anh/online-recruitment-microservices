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
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, formatApiError } from "@/lib/api";

type RegisteredUser = {
  id: string;
  email: string;
  fullName: string;
  role: "CANDIDATE";
};

type RegisterResponse = {
  user: RegisteredUser;
};

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<RegisteredUser | null>(
    null,
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Mật khẩu cần có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post<RegisterResponse>("/auth/register", {
        email: email.trim(),
        fullName: fullName.trim(),
        password,
        role: "CANDIDATE",
      });
      setRegisteredUser(response.data.user);
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#172033]">
      <header className="h-16 border-b border-[#e9edf5] bg-white/90">
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5"
            aria-label="CareerLink trang chủ"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f52ba] text-white shadow-sm">
              <BriefcaseBusiness
                aria-hidden="true"
                size={19}
                strokeWidth={2.2}
              />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#14294c]">
              Career<span className="text-[#0f52ba]">Link</span>
            </span>
          </Link>
          <p className="text-sm text-[#68758b]">
            Đã có tài khoản?{" "}
            <Link
              href="/"
              className="font-semibold text-[#0f52ba] hover:text-[#0c469f]"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.78fr_1.12fr] lg:gap-12 lg:px-8 lg:py-8">
        <section className="relative isolate hidden min-h-[680px] overflow-hidden rounded-xl bg-[#eff4ff] p-10 text-[#172033] shadow-[0_20px_55px_-38px_rgba(25,43,77,0.3)] lg:flex lg:flex-col xl:min-h-[814px]">
          <div className="pointer-events-none absolute -left-20 -top-20 -z-10 h-72 w-72 rounded-full bg-[#003c90]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-16 -z-10 h-80 w-80 rounded-full bg-[#86f2e4]/40 blur-3xl" />

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-semibold tracking-wide text-[#34445e]">
            <span className="h-2 w-2 rounded-full bg-[#006a61]" />
            CAREERLINK · CÙNG BẠN TIẾN XA
          </div>

          <div className="mt-14 max-w-md">
            <p className="text-sm font-medium text-[#0f52ba]">
              Bắt đầu hành trình của bạn
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.16] tracking-tight text-[#172033] xl:text-[44px]">
              Mở ra cơ hội,
              <br />
              kết nối tương lai
              <span className="text-[#0f52ba]">.</span>
            </h1>
            <p className="mt-5 max-w-sm text-[15px] leading-7 text-[#68758b]">
              Tạo tài khoản CareerLink để kết nối với những cơ hội nghề nghiệp
              phù hợp và phát triển theo cách của riêng bạn.
            </p>
          </div>

          <div className="mt-10 space-y-3">
            <div className="flex min-h-[88px] items-center gap-4 rounded-lg bg-white px-4 py-4 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d9e2ff] text-[#0f52ba]">
                <BriefcaseBusiness aria-hidden="true" size={20} />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Cơ hội dành cho bạn</h2>
                <p className="mt-1 text-xs leading-5 text-[#68758b]">
                  Khám phá các vị trí phù hợp với kỹ năng và mục tiêu nghề
                  nghiệp.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-white px-4 py-4 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d3e4fe] text-[#0f52ba]">
                <ShieldCheck aria-hidden="true" size={20} />
              </span>
              <div className="mt-3">
                <h2 className="text-sm font-semibold">Kết nối tin cậy</h2>
                <p className="mt-1 text-xs leading-5 text-[#68758b]">
                  Ứng tuyển và theo dõi tiến trình ngay trên một nền tảng.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-8 text-xs text-[#68758b]">
            Một tài khoản, nhiều cơ hội phát triển.
          </div>
        </section>

        <section className="flex min-h-[680px] items-center justify-center rounded-xl border border-[#edf0f6] bg-white px-6 py-10 shadow-[0_16px_50px_-36px_rgba(25,43,77,0.35)] sm:px-10 lg:min-h-[627px] lg:self-start lg:px-10 xl:px-12">
          <div className="w-full max-w-[480px]">
            {registeredUser ? (
              <div className="py-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#0f52ba]">
                  <Check aria-hidden="true" size={27} strokeWidth={2.5} />
                </div>
                <p className="mt-7 text-sm font-semibold text-[#0f52ba]">
                  TẠO TÀI KHOẢN THÀNH CÔNG
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#172033]">
                  Chào mừng, {registeredUser.fullName}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#68758b]">
                  Tài khoản {registeredUser.email} đã được tạo. Bạn đã được
                  đăng nhập và có thể bắt đầu sử dụng CareerLink.
                </p>
                <Link
                  href="/"
                  className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#0f52ba] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(15,82,186,0.7)] transition hover:bg-[#0c469f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0f52ba]/20"
                >
                  Tiếp tục
                  <ArrowRight aria-hidden="true" className="ml-2" size={18} />
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#eff4ff] px-3 py-1.5 text-xs font-semibold text-[#0f52ba]">
                    <ShieldCheck aria-hidden="true" size={15} />
                    TẠO TÀI KHOẢN MIỄN PHÍ
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight text-[#172033] sm:text-[34px]">
                    Tạo tài khoản mới
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#68758b]">
                    Tham gia CareerLink và mở ra cơ hội tiếp theo của bạn.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-2 block text-sm font-medium text-[#303c50]"
                    >
                      Họ và tên
                    </label>
                    <div className="relative">
                      <UserRound
                        aria-hidden="true"
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#98a3b4]"
                        size={18}
                      />
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        required
                        maxLength={160}
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Nguyễn Văn An"
                        className="h-12 w-full rounded-lg border border-[#dfe5ef] bg-[#f8f9fc] pl-11 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a9b7] focus:border-[#0f52ba] focus:bg-white focus:ring-4 focus:ring-[#0f52ba]/10"
                      />
                    </div>
                  </div>

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

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="password"
                        className="mb-2 block text-sm font-medium text-[#303c50]"
                      >
                        Mật khẩu
                      </label>
                      <div className="relative">
                        <LockKeyhole
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98a3b4]"
                          size={17}
                        />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          minLength={8}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Ít nhất 8 ký tự"
                          className="h-12 w-full rounded-lg border border-[#dfe5ef] bg-[#f8f9fc] pl-10 pr-10 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a9b7] focus:border-[#0f52ba] focus:bg-white focus:ring-4 focus:ring-[#0f52ba]/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((visible) => !visible)}
                          className="absolute right-2 top-1/2 flex h-9 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#8591a4] transition hover:bg-[#edf2fa] hover:text-[#34445e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f52ba]"
                          aria-label={
                            showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                          }
                          aria-pressed={showPassword}
                        >
                          {showPassword ? (
                            <EyeOff aria-hidden="true" size={17} />
                          ) : (
                            <Eye aria-hidden="true" size={17} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="mb-2 block text-sm font-medium text-[#303c50]"
                      >
                        Xác nhận mật khẩu
                      </label>
                      <div className="relative">
                        <LockKeyhole
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98a3b4]"
                          size={17}
                        />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          minLength={8}
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          placeholder="Nhập lại mật khẩu"
                          className="h-12 w-full rounded-lg border border-[#dfe5ef] bg-[#f8f9fc] pl-10 pr-10 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a9b7] focus:border-[#0f52ba] focus:bg-white focus:ring-4 focus:ring-[#0f52ba]/10"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword((visible) => !visible)
                          }
                          className="absolute right-2 top-1/2 flex h-9 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#8591a4] transition hover:bg-[#edf2fa] hover:text-[#34445e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f52ba]"
                          aria-label={
                            showConfirmPassword
                              ? "Ẩn mật khẩu xác nhận"
                              : "Hiện mật khẩu xác nhận"
                          }
                          aria-pressed={showConfirmPassword}
                        >
                          {showConfirmPassword ? (
                            <EyeOff aria-hidden="true" size={17} />
                          ) : (
                            <Eye aria-hidden="true" size={17} />
                          )}
                        </button>
                      </div>
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
                        Đang tạo tài khoản...
                      </>
                    ) : (
                      <>
                        Tạo tài khoản
                        <ArrowRight
                          aria-hidden="true"
                          className="ml-2"
                          size={18}
                        />
                      </>
                    )}
                  </Button>
                </form>

                <p className="mt-5 text-center text-xs leading-5 text-[#7c8799]">
                  Là doanh nghiệp?{" "}
                  <Link
                    href="/register/recruiter"
                    className="font-semibold text-[#0f52ba] hover:text-[#0c469f]"
                  >
                    Đăng ký nhà tuyển dụng
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
