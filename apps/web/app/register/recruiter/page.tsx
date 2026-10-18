"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Check,
  Eye,
  EyeOff,
  FileUp,
  Hash,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Network,
  Phone,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";

type RegisterResponse = {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: "RECRUITER";
    verificationStatus: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
  };
};

type CompanyInput = {
  name: string;
  industry: string;
  location: string;
  description: string;
  verificationDetails: string;
};

const COMPANY_SIZES = [
  "1 - 10 nhân sự",
  "11 - 50 nhân sự",
  "51 - 200 nhân sự",
  "201 - 500 nhân sự",
  "500+ nhân sự",
];

const JOB_TITLES = [
  "Giám đốc / Chủ doanh nghiệp",
  "Trưởng phòng Nhân sự",
  "Chuyên viên Tuyển dụng",
  "Quản lý / Trưởng bộ phận",
  "Khác",
];

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];
const MAX_FILE_BYTES = 15 * 1024 * 1024;

const fieldClass =
  "h-12 w-full rounded-lg border border-[#dfe5ef] bg-[#eff4ff] px-4 text-sm text-[#172033] outline-none transition placeholder:text-[#8b96a8] focus:border-[#0f52ba] focus:bg-white focus:ring-4 focus:ring-[#0f52ba]/10";

function FormField({
  id,
  label,
  icon: Icon,
  children,
  required = false,
}: {
  id: string;
  label: string;
  icon?: typeof UserRound;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-semibold text-[#303c50]"
      >
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8793a6]"
            size={17}
          />
        )}
        {children}
      </div>
    </div>
  );
}

function SectionTitle({
  number,
  children,
  badge,
}: {
  number: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-[#172033]">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#dce9ff] text-xs font-bold text-[#0f52ba]">
          {number}
        </span>
        {children}
      </h2>
      {badge}
    </div>
  );
}

export default function RecruiterRegisterPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [companyInput, setCompanyInput] = useState<CompanyInput | null>(null);
  const [companySaved, setCompanySaved] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  function handleLicenseFile(file: File | null) {
    if (!file) {
      setLicenseFile(null);
      return;
    }
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError("Chỉ chấp nhận tệp PDF, PNG hoặc JPG.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Dung lượng tệp tối đa 15MB.");
      return;
    }
    setError("");
    setLicenseFile(file);
  }

  async function saveCompanyProfile(input: CompanyInput) {
    setError("");
    setIsSavingCompany(true);
    try {
      await api.put("/companies/me", input);
      setCompanySaved(true);
      setCompanyInput(null);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setIsSavingCompany(false);
    }
  }

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
    if (!acceptedTerms) {
      setError("Vui lòng xác nhận thông tin và đồng ý với điều khoản sử dụng.");
      return;
    }

    const company: CompanyInput = {
      name: companyName.trim(),
      industry: "Chưa cập nhật",
      location: location.trim(),
      description: `Quy mô: ${companySize}`,
      verificationDetails: [
        `Mã số thuế: ${taxId.trim()}`,
        `Quy mô nhân sự: ${companySize}`,
        `Người đại diện: ${fullName.trim()}`,
        `Chức vụ: ${jobTitle}`,
        `Số điện thoại: ${phone.trim()}`,
        licenseFile
          ? `Tài liệu GPKD (chờ tải lên storage): ${licenseFile.name}`
          : "Tài liệu GPKD: chưa đính kèm (bổ sung sau)",
      ].join("\n"),
    };

    setIsSubmitting(true);
    try {
      const response = await api.post<RegisterResponse>("/auth/register", {
        email: email.trim(),
        fullName: fullName.trim(),
        password,
        role: "RECRUITER",
      });
      setRegisteredEmail(response.data.user.email);
      setCompanyInput(company);
      setPassword("");
      setConfirmPassword("");
      await saveCompanyProfile(company);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isSavingCompany;

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#0B1C30]">
      <header className="border-b border-[#E8ECF4] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
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
          <p className="hidden text-sm text-[#68758B] sm:block">
            Đã có tài khoản?{" "}
            <Link
              href="/"
              className="font-semibold text-[#0F52BA] hover:text-[#003C90]"
            >
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.78fr_1.12fr] lg:items-start lg:gap-8 lg:px-8 lg:py-8">
        <aside className="relative isolate hidden min-h-[640px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#003C90] via-[#0F52BA] to-[#0A3A7A] p-8 text-white shadow-[0_24px_60px_-28px_rgba(0,60,144,0.55)] lg:flex lg:flex-col xl:p-10">
          <div className="pointer-events-none absolute -right-12 -top-16 -z-10 h-56 w-56 rounded-full bg-[#89F5E7]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 -z-10 h-48 w-48 rounded-full bg-[#B0C6FF]/15 blur-3xl" />

          <h1 className="text-[28px] font-bold leading-snug tracking-tight xl:text-[30px]">
            Đồng hành tuyển dụng cùng{" "}
            <span className="text-[#89F5E7]">1,200+ Doanh nghiệp dẫn đầu</span>
          </h1>
          <p className="mt-3 text-xs leading-5 text-blue-100/90">
            Mở rộng lựa chọn ứng viên, quản lý tin tuyển dụng chuẩn hóa và xây
            dựng tài khoản doanh nghiệp chuyên nghiệp trên nền tảng.
          </p>

          <div className="relative mt-7 overflow-hidden rounded-xl border border-white/15 shadow-lg">
            <div
              className="aspect-[16/11] bg-cover bg-center"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80)",
              }}
              role="img"
              aria-label="Đội ngũ doanh nghiệp họp tuyển dụng"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#003C90]/70 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <div className="inline-flex max-w-full items-center gap-2 rounded-lg bg-[#006A61] px-3 py-2 text-[11px] font-semibold leading-4 text-white shadow-md">
                <ShieldCheck aria-hidden="true" size={14} className="shrink-0" />
                <span>
                  Hệ thống xác thực doanh nghiệp 2 lớp chuẩn ISO/IEC
                </span>
              </div>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-2 text-lg font-bold">
                <UserPlus
                  aria-hidden="true"
                  size={17}
                  className="text-[#89f5e7]"
                />
                50,000+
              </p>
              <p className="mt-1 text-[11px] leading-4 text-blue-100">
                Ứng viên công nghệ tinh hoa
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-2 text-lg font-bold">
                <BadgeCheck
                  aria-hidden="true"
                  size={17}
                  className="text-[#89f5e7]"
                />
                ATS Suite
              </p>
              <p className="mt-1 text-[11px] leading-4 text-blue-100">
                Quản lý pipeline tự động
              </p>
            </div>
          </div>
        </aside>

        <section className="rounded-xl border border-[#edf0f6] bg-white px-5 py-7 shadow-[0_16px_50px_-36px_rgba(25,43,77,0.35)] sm:px-8 lg:px-10 lg:py-8">
          {registeredEmail ? (
            <div className="mx-auto max-w-xl py-10">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                  companySaved
                    ? "bg-[#eaf2ff] text-[#0f52ba]"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {companySaved ? (
                  <Check aria-hidden="true" size={27} strokeWidth={2.5} />
                ) : (
                  <Building2 aria-hidden="true" size={25} />
                )}
              </div>
              <p className="mt-7 text-sm font-semibold text-[#0f52ba]">
                {companySaved
                  ? "ĐĂNG KÝ THÀNH CÔNG"
                  : "TÀI KHOẢN ĐÃ ĐƯỢC TẠO"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#172033]">
                {companySaved
                  ? "Cảm ơn bạn đã đăng ký"
                  : "Hoàn tất hồ sơ doanh nghiệp"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#68758b]">
                Tài khoản nhà tuyển dụng cho{" "}
                <span className="font-medium text-[#25334b]">
                  {registeredEmail}
                </span>{" "}
                {companySaved
                  ? "đã được tạo. Hồ sơ doanh nghiệp đang chờ quản trị viên xác minh."
                  : "đã được tạo, nhưng hồ sơ doanh nghiệp chưa lưu thành công."}
              </p>

              {!companySaved && error && (
                <p
                  className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {companySaved && (
                <div className="mt-6 rounded-lg border border-[#dce9ff] bg-[#eff4ff] px-4 py-3.5 text-sm leading-6 text-[#38527a]">
                  Bạn sẽ có thể đăng tin tuyển dụng sau khi hồ sơ được xác minh.
                </div>
              )}

              {!companySaved && companyInput && (
                <button
                  type="button"
                  className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#0f52ba] text-sm font-semibold text-white transition hover:bg-[#0c469f] disabled:opacity-60"
                  onClick={() => void saveCompanyProfile(companyInput)}
                  disabled={isSavingCompany}
                >
                  {isSavingCompany ? (
                    <>
                      <LoaderCircle
                        aria-hidden="true"
                        className="mr-2 animate-spin"
                        size={18}
                      />
                      Đang lưu hồ sơ...
                    </>
                  ) : (
                    <>
                      Thử lưu hồ sơ doanh nghiệp
                      <ArrowRight
                        aria-hidden="true"
                        className="ml-2"
                        size={18}
                      />
                    </>
                  )}
                </button>
              )}
              {companySaved && (
                <Link
                  href="/"
                  className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#0f52ba] px-5 text-sm font-semibold text-white transition hover:bg-[#0c469f]"
                >
                  Tiếp tục
                  <ArrowRight aria-hidden="true" className="ml-2" size={18} />
                </Link>
              )}
              <p className="mt-5 text-center text-sm text-[#68758b]">
                <Link
                  href="/"
                  className="font-semibold text-[#0f52ba] hover:text-[#0c469f]"
                >
                  Quay lại đăng nhập
                </Link>
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 border-b border-[#dce9ff] pb-5">
                <h2 className="text-2xl font-bold tracking-tight text-[#172033]">
                  Đăng ký Tài khoản Doanh nghiệp
                </h2>
                <p className="mt-1.5 text-xs leading-5 text-[#68758b]">
                  Dành riêng cho Nhà tuyển dụng, HR Leader và Ban Điều hành
                  doanh nghiệp tại Việt Nam.
                </p>
              </div>

              <form className="space-y-7" onSubmit={handleSubmit}>
                <section className="space-y-4">
                  <SectionTitle number="1">
                    Thông tin Người đại diện tuyển dụng
                  </SectionTitle>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      id="fullName"
                      label="Họ và tên người phụ trách"
                      icon={UserRound}
                      required
                    >
                      <input
                        id="fullName"
                        name="fullName"
                        autoComplete="name"
                        maxLength={160}
                        required
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Nguyễn Văn An"
                        className={`${fieldClass} pl-11`}
                      />
                    </FormField>

                    <FormField
                      id="jobTitle"
                      label="Chức vụ hiện tại"
                      icon={Briefcase}
                      required
                    >
                      <select
                        id="jobTitle"
                        name="jobTitle"
                        required
                        value={jobTitle}
                        onChange={(event) => setJobTitle(event.target.value)}
                        className={`${fieldClass} appearance-none pl-11`}
                      >
                        <option value="" disabled>
                          Chọn chức vụ đảm nhiệm
                        </option>
                        {JOB_TITLES.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField
                      id="email"
                      label="Email doanh nghiệp"
                      icon={Mail}
                      required
                    >
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        maxLength={320}
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="name@company.com"
                        className={`${fieldClass} pl-11`}
                      />
                    </FormField>

                    <FormField
                      id="phone"
                      label="Số điện thoại di động"
                      icon={Phone}
                      required
                    >
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        maxLength={32}
                        required
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="0987 654 321"
                        className={`${fieldClass} pl-11`}
                      />
                    </FormField>
                  </div>
                </section>

                <section className="space-y-4">
                  <SectionTitle number="2">
                    Thông tin Pháp lý &amp; Hồ sơ Doanh nghiệp
                  </SectionTitle>

                  <FormField
                    id="companyName"
                    label="Tên công ty đầy đủ"
                    icon={Building2}
                    required
                  >
                    <input
                      id="companyName"
                      name="companyName"
                      autoComplete="organization"
                      maxLength={200}
                      required
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      placeholder="CÔNG TY CỔ PHẦN CÔNG NGHỆ..."
                      className={`${fieldClass} pl-11`}
                    />
                  </FormField>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      id="taxId"
                      label="Mã số thuế (MST)"
                      icon={Hash}
                      required
                    >
                      <input
                        id="taxId"
                        name="taxId"
                        autoComplete="off"
                        maxLength={32}
                        required
                        value={taxId}
                        onChange={(event) => setTaxId(event.target.value)}
                        placeholder="0109876543"
                        className={`${fieldClass} pl-11`}
                      />
                    </FormField>

                    <FormField
                      id="companySize"
                      label="Quy mô nhân sự"
                      icon={Users}
                      required
                    >
                      <select
                        id="companySize"
                        name="companySize"
                        required
                        value={companySize}
                        onChange={(event) => setCompanySize(event.target.value)}
                        className={`${fieldClass} appearance-none pl-11`}
                      >
                        <option value="" disabled>
                          Chọn quy mô nhân sự
                        </option>
                        {COMPANY_SIZES.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <FormField
                    id="location"
                    label="Địa chỉ trụ sở chính"
                    icon={MapPin}
                    required
                  >
                    <input
                      id="location"
                      name="location"
                      autoComplete="street-address"
                      maxLength={160}
                      required
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder="Tầng 12, Tòa nhà Landmark, Quận Cầu Giấy, Hà Nội"
                      className={`${fieldClass} pl-11`}
                    />
                  </FormField>
                </section>

                <section className="space-y-4">
                  <SectionTitle number="3">
                    Mật khẩu bảo mật tài khoản
                  </SectionTitle>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      id="password"
                      label="Mật khẩu đăng nhập"
                      icon={Lock}
                      required
                    >
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        className={`${fieldClass} pl-11 pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[#8591a4] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f52ba]"
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
                    </FormField>

                    <FormField
                      id="confirmPassword"
                      label="Xác nhận mật khẩu"
                      icon={ShieldCheck}
                      required
                    >
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        placeholder="••••••••"
                        className={`${fieldClass} pl-11 pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((visible) => !visible)
                        }
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[#8591a4] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f52ba]"
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
                    </FormField>
                  </div>
                </section>

                <section className="space-y-4">
                  <SectionTitle
                    number="4"
                    badge={
                      <span className="rounded-full bg-[#CFFAF3] px-2.5 py-1 text-[10px] font-semibold text-[#006A61]">
                        Tùy chọn tải ngay để duyệt trong 2h
                      </span>
                    }
                  >
                    Tài liệu Giấy phép Kinh doanh
                  </SectionTitle>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    className="sr-only"
                    onChange={(event) =>
                      handleLicenseFile(event.target.files?.[0] ?? null)
                    }
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleLicenseFile(event.dataTransfer.files?.[0] ?? null);
                    }}
                    className="flex w-full flex-col items-center rounded-xl border border-dashed border-[#b7c9e8] bg-[#eff4ff]/80 px-4 py-8 text-center transition hover:border-[#0f52ba] hover:bg-[#eff4ff]"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#dce9ff] text-[#0f52ba]">
                      <FileUp aria-hidden="true" size={22} />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-[#25334b]">
                      {licenseFile
                        ? licenseFile.name
                        : "Kéo thả tệp PDF hoặc hình ảnh Scan GPKD vào đây"}
                    </p>
                    <p className="mt-1 text-xs text-[#68758b]">
                      Định dạng cho phép: PDF, PNG, JPG (Dung lượng tối đa 15MB)
                    </p>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-[#68758b]">
                      <ShieldCheck
                        aria-hidden="true"
                        size={13}
                        className="text-[#0f52ba]"
                      />
                      Dữ liệu được mã hóa theo chuẩn bảo mật BR-A08
                    </p>
                  </button>
                </section>

                <div>
                  <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-[#5b6678]">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) =>
                        setAcceptedTerms(event.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#0f52ba]"
                    />
                    <span>
                      Tôi cam kết điền thông tin chính xác và đồng ý với{" "}
                      <span className="font-medium text-[#0f52ba]">
                        Quy chế hoạt động sàn
                      </span>
                      ,{" "}
                      <span className="font-medium text-[#0f52ba]">
                        Chính sách bảo mật
                      </span>{" "}
                      của Tuyển dụng nhanh.
                    </span>
                  </label>
                </div>

                {error && (
                  <p
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#003c90] text-sm font-semibold text-white transition hover:bg-[#0f52ba] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f52ba] disabled:opacity-60"
                  disabled={isBusy}
                >
                  {isBusy ? (
                    <>
                      <LoaderCircle
                        aria-hidden="true"
                        className="mr-2 animate-spin"
                        size={18}
                      />
                      {isSubmitting
                        ? "Đang tạo tài khoản..."
                        : "Đang lưu hồ sơ..."}
                    </>
                  ) : (
                    <>
                      Đăng ký tài khoản &amp; Gửi yêu cầu xác minh
                      <UserPlus
                        aria-hidden="true"
                        className="ml-2"
                        size={18}
                      />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-[#68758b]">
                Doanh nghiệp đã có tài khoản?{" "}
                <Link
                  href="/"
                  className="font-semibold text-[#0f52ba] hover:text-[#0c469f]"
                >
                  Đăng nhập ngay
                </Link>
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
