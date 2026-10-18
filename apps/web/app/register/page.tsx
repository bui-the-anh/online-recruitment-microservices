"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  Network,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
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

const FEATURES = [
  {
    title: "Không lưu CV cố định.",
    description:
      "Quản lý hồ sơ linh hoạt, cập nhật kỹ năng và kinh nghiệm bất cứ lúc nào trước khi ứng tuyển.",
    icon: FileText,
    iconBg: "bg-[#DCE9FF]",
    iconColor: "text-[#003C90]",
  },
  {
    title: "Theo dõi tiến trình thời gian thực.",
    description:
      "Nhận cập nhật trạng thái ứng tuyển ngay khi nhà tuyển dụng thao tác trên hệ thống.",
    icon: Activity,
    iconBg: "bg-[#CFFAF3]",
    iconColor: "text-[#006A61]",
    flow: true,
  },
  {
    title: "100% Doanh nghiệp xác thực.",
    description:
      "Chỉ kết nối với doanh nghiệp đã kiểm chứng giấy phép và mã số thuế, bảo vệ quyền lợi ứng viên.",
    icon: ShieldCheck,
    iconBg: "bg-[#DCE9FF]",
    iconColor: "text-[#003C90]",
  },
];

const PASSWORD_RULES = [
  {
    id: "length",
    label: "Tối thiểu 8 ký tự",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "upper",
    label: "Có ít nhất 1 chữ hoa",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "digit",
    label: "Có ít nhất 1 chữ số",
    test: (value: string) => /\d/.test(value),
  },
  {
    id: "special",
    label: "Ký tự đặc biệt",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<RegisteredUser | null>(
    null,
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordChecks = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        passed: rule.test(password),
      })),
    [password],
  );

  const passwordStrengthLabel = useMemo(() => {
    if (!password) return "Chưa nhập";
    const passed = passwordChecks.filter((rule) => rule.passed).length;
    if (passed <= 1) return "Yếu";
    if (passed === 2) return "Trung bình";
    if (passed === 3) return "Khá";
    return "Mạnh";
  }, [password, passwordChecks]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const allPassed = passwordChecks.every((rule) => rule.passed);
    if (!allPassed) {
      setError("Mật khẩu chưa đáp ứng đủ các yêu cầu bảo mật.");
      return;
    }
    if (!agreed) {
      setError("Bạn cần đồng ý với điều khoản sử dụng để tiếp tục.");
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

      const trimmedPhone = phone.trim();
      if (trimmedPhone) {
        try {
          await api.patch("/candidate/profile", { phone: trimmedPhone });
        } catch {
          // Đăng ký đã thành công — phone có thể cập nhật sau trong hồ sơ.
        }
      }

      setRegisteredUser(response.data.user);
      setPassword("");
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#0B1C30]">
      <header className="border-b border-[#E8ECF4] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5"
            aria-label="Tuyển dụng nhanh"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003C90] text-white shadow-sm">
              <Network aria-hidden="true" size={18} />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#003C90]">
              Tuyển dụng nhanh
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.95fr_1.15fr] lg:items-stretch lg:gap-8 lg:px-8 lg:py-8">
        <aside className="relative isolate hidden overflow-hidden rounded-2xl bg-[#EFF4FF] p-8 text-[#0B1C30] shadow-[0_20px_50px_-32px_rgba(0,60,144,0.28)] lg:flex lg:flex-col xl:p-10">
          <div className="pointer-events-none absolute -left-16 -top-20 -z-10 h-72 w-72 rounded-full bg-[#003C90]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-12 -z-10 h-80 w-80 rounded-full bg-[#86F2E4]/45 blur-3xl" />

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#34445E] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#006A61]" />
            Cộng đồng 45.000+ Kỹ sư & Chuyên gia số
          </div>

          <h1 className="mt-8 max-w-[20ch] text-[32px] font-bold leading-[1.2] tracking-tight xl:text-[36px]">
            Khám phá cơ hội nghề nghiệp{" "}
            <span className="text-[#0F52BA]">bứt phá</span> tại các công ty công
            nghệ hàng đầu.
          </h1>
          <p className="mt-4 max-w-[42ch] text-sm leading-6 text-[#68758B]">
            Xây dựng hồ sơ chuyên nghiệp, theo dõi tiến trình ứng tuyển minh
            bạch và kết nối với doanh nghiệp đã được xác thực trên nền tảng.
          </p>

          <div className="mt-8 space-y-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl bg-white px-4 py-3.5 shadow-sm"
                >
                  <div className="flex items-start gap-3.5">
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${feature.iconBg}`}
                    >
                      <Icon
                        aria-hidden="true"
                        size={18}
                        className={feature.iconColor}
                      />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#0B1C30]">
                        {feature.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-[#68758B]">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  {feature.flow ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-[#68758B]">
                      <span>Đã nộp</span>
                      <span className="text-[#C3C6D5]">›</span>
                      <span>Đã xem</span>
                      <span className="text-[#C3C6D5]">›</span>
                      <span>Phỏng vấn</span>
                      <span className="text-[#C3C6D5]">›</span>
                      <span className="rounded-full bg-[#DCE9FF] px-2 py-0.5 font-semibold text-[#003C90]">
                        Nhận Offer
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="flex items-center justify-center py-2 lg:py-0">
          <div className="w-full max-w-[560px] rounded-2xl bg-white p-6 shadow-[0_18px_50px_-28px_rgba(20,41,76,0.35)] sm:p-8 lg:p-10">
            {registeredUser ? (
              <div className="space-y-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF4FF] text-[#003C90]">
                  <Check aria-hidden="true" size={26} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F52BA]">
                    TẠO TÀI KHOẢN THÀNH CÔNG
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#0B1C30] sm:text-[28px]">
                    Chào mừng, {registeredUser.fullName}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#68758B]">
                    Tài khoản {registeredUser.email} đã sẵn sàng. Bạn có thể
                    đăng nhập và bắt đầu hành trình sự nghiệp ngay.
                  </p>
                </div>
                <Link
                  href="/"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#003C90] text-sm font-semibold text-white transition hover:bg-[#0F52BA]"
                >
                  Đăng nhập ngay
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#0B1C30] sm:text-[28px]">
                    Tạo tài khoản Ứng viên
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#68758B]">
                    Tham gia cộng đồng nhân tài công nghệ và mở khóa cơ hội việc
                    làm phù hợp với bạn.
                  </p>
                </div>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#E8ECF4]" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#98A3B4]">
                    Đăng ký bằng Email
                  </span>
                  <div className="h-px flex-1 bg-[#E8ECF4]" />
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-1.5 block text-sm font-medium text-[#0B1C30]"
                    >
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <UserRound
                        aria-hidden="true"
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737784]"
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
                        placeholder="Ví dụ: Nguyễn Thu Hà"
                        className="h-12 w-full rounded-xl border border-transparent bg-[#F8F9FF] py-2.5 pl-10 pr-3 text-sm text-[#0B1C30] outline-none transition placeholder:text-[#C3C6D5] focus:border-[#0F52BA]/40 focus:bg-white focus:ring-2 focus:ring-[#0F52BA]/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-[#0B1C30]"
                    >
                      Email cá nhân <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail
                        aria-hidden="true"
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737784]"
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
                        placeholder="ha.nguyen@email.com"
                        className="h-12 w-full rounded-xl border border-transparent bg-[#F8F9FF] py-2.5 pl-10 pr-3 text-sm text-[#0B1C30] outline-none transition placeholder:text-[#C3C6D5] focus:border-[#0F52BA]/40 focus:bg-white focus:ring-2 focus:ring-[#0F52BA]/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1.5 block text-sm font-medium text-[#0B1C30]"
                    >
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone
                        aria-hidden="true"
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737784]"
                      />
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        maxLength={32}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="0912 345 678"
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
                        Mật khẩu bảo mật <span className="text-red-500">*</span>
                      </label>
                      <span
                        className={`text-xs font-semibold ${
                          passwordStrengthLabel === "Mạnh"
                            ? "text-[#006A61]"
                            : passwordStrengthLabel === "Chưa nhập"
                              ? "text-[#98A3B4]"
                              : "text-[#0F52BA]"
                        }`}
                      >
                        {passwordStrengthLabel}
                      </span>
                    </div>
                    <div className="relative">
                      <Lock
                        aria-hidden="true"
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737784]"
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
                        placeholder="Tối thiểu 8 ký tự, gồm số & chữ hoa"
                        className="h-12 w-full rounded-xl border border-transparent bg-[#F8F9FF] py-2.5 pl-10 pr-11 text-sm text-[#0B1C30] outline-none transition placeholder:text-[#C3C6D5] focus:border-[#0F52BA]/40 focus:bg-white focus:ring-2 focus:ring-[#0F52BA]/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#737784] transition hover:text-[#0B1C30]"
                        aria-label={
                          showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                        }
                      >
                        {showPassword ? (
                          <EyeOff aria-hidden="true" size={16} />
                        ) : (
                          <Eye aria-hidden="true" size={16} />
                        )}
                      </button>
                    </div>

                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {passwordChecks.map((rule) => (
                        <li
                          key={rule.id}
                          className="inline-flex items-center gap-2 text-xs text-[#68758B]"
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              rule.passed
                                ? "border-[#006A61] bg-[#006A61] text-white"
                                : "border-[#C3C6D5] bg-white"
                            }`}
                            aria-hidden="true"
                          >
                            {rule.passed ? (
                              <Check size={10} strokeWidth={3} />
                            ) : null}
                          </span>
                          {rule.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <label className="flex items-start gap-3 rounded-xl bg-[#F8F9FF] px-3.5 py-3 text-sm leading-5 text-[#68758B]">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-[#C3C6D5] text-[#003C90] focus:ring-[#0F52BA]"
                    />
                    <span>
                      Tôi đồng ý với{" "}
                      <span className="font-semibold text-[#003C90]">
                        Điều khoản sử dụng
                      </span>{" "}
                      và{" "}
                      <span className="font-semibold text-[#003C90]">
                        Chính sách bảo vệ dữ liệu cá nhân
                      </span>{" "}
                      của Tuyển dụng nhanh.
                    </span>
                  </label>

                  {error ? (
                    <p
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                      role="alert"
                    >
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#003C90] text-sm font-semibold text-white transition hover:bg-[#0F52BA] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? "Đang tạo tài khoản..."
                      : "Tạo tài khoản Ứng viên"}
                    {!isSubmitting ? (
                      <ArrowRight aria-hidden="true" size={16} />
                    ) : null}
                  </button>
                </form>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#68758B]">
                    Đã có tài khoản?{" "}
                    <Link
                      href="/"
                      className="font-semibold text-[#0F52BA] hover:text-[#003C90]"
                    >
                      Đăng nhập ngay
                    </Link>
                  </p>
                  <Link
                    href="/register/recruiter"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#006A61] hover:text-[#004F48]"
                  >
                    <Building2 aria-hidden="true" size={16} />
                    Đăng ký Doanh nghiệp
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
