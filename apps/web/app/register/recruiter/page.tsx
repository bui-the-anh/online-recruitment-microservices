"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  Eye,
  EyeOff,
  FileCheck2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

function SectionTitle({ number, children }: { number: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-[#172033]">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#dce9ff] text-xs font-bold text-[#0f52ba]">
        {number}
      </span>
      {children}
    </h2>
  );
}

export default function RecruiterRegisterPage() {
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [companyInput, setCompanyInput] = useState<CompanyInput | null>(null);
  const [companySaved, setCompanySaved] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);

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
      industry,
      location: location.trim(),
      description: description.trim(),
      verificationDetails: [
        `Mã số thuế: ${taxId.trim()}`,
        `Người đại diện: ${fullName.trim()}`,
        `Chức vụ: ${jobTitle}`,
        `Số điện thoại: ${phone.trim()}`,
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
    <div className="min-h-screen bg-[#f8f9ff] text-[#172033]">
      <header className="h-16 border-b border-[#e9edf5] bg-white/90">
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5"
            aria-label="CareerLink trang chủ"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f52ba] text-white shadow-sm">
              <BriefcaseBusiness aria-hidden="true" size={19} />
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
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.78fr_1.12fr] lg:items-start lg:gap-12 lg:px-8 lg:py-8">
        <aside className="relative isolate hidden min-h-[534px] overflow-hidden rounded-xl bg-[#0f52ba] p-8 text-white shadow-[0_20px_55px_-38px_rgba(25,43,77,0.4)] lg:flex lg:flex-col xl:p-10">
          <div className="pointer-events-none absolute -right-12 -top-16 -z-10 h-56 w-56 rounded-full bg-[#89f5e7]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 -z-10 h-48 w-48 rounded-full bg-[#1d59c1]/70 blur-3xl" />

          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            <BriefcaseBusiness aria-hidden="true" size={17} />
            Tuyển dụng nhanh
          </div>
          <h1 className="mt-7 text-2xl font-bold leading-snug xl:text-[28px]">
            Đồng hành tuyển dụng cùng 1,200+ doanh nghiệp dẫn đầu
          </h1>
          <p className="mt-3 text-xs leading-5 text-blue-100">
            Mở rộng lựa chọn ứng viên, quản lý tin tuyển dụng và xây dựng đội
            ngũ phù hợp cho hành trình phát triển của doanh nghiệp.
          </p>

          <div className="mt-6 rounded-xl border border-white/15 bg-gradient-to-br from-[#0b3878] via-[#1262bd] to-[#0a2d60] p-5">
            <div className="flex aspect-[1.8] flex-col justify-between rounded-lg border border-white/10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(137,245,231,0.25),transparent_55%),linear-gradient(145deg,#0d3976,#071f47)] p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-blue-100">
                  CAREERLINK TALENT
                </span>
                <Sparkles aria-hidden="true" size={17} className="text-[#89f5e7]" />
              </div>
              <div className="flex items-end justify-between gap-2">
                {[38, 58, 46, 74, 62, 88, 70].map((height, index) => (
                  <span
                    key={index}
                    className="w-full rounded-t-sm bg-gradient-to-t from-[#89f5e7]/20 to-[#89f5e7]/80"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <p className="text-[10px] font-medium text-blue-100">
                Kết nối đúng người, đúng cơ hội
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-blue-100">
              <ShieldCheck aria-hidden="true" size={14} className="text-[#89f5e7]" />
              Thông tin doanh nghiệp được xét duyệt an toàn
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
            <div className="rounded-lg border border-white/15 bg-white/10 p-4">
              <p className="flex items-center gap-2 text-lg font-bold">
                <Users aria-hidden="true" size={17} className="text-[#89f5e7]" />
                50,000+
              </p>
              <p className="mt-1 text-[11px] leading-4 text-blue-100">
                Ứng viên tiềm năng
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-4">
              <p className="flex items-center gap-2 text-lg font-bold">
                <BadgeCheck aria-hidden="true" size={17} className="text-[#89f5e7]" />
                ATS Suite
              </p>
              <p className="mt-1 text-[11px] leading-4 text-blue-100">
                Quản lý tuyển dụng dễ dàng
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
                <Button
                  type="button"
                  className="mt-7 h-12 w-full rounded-lg bg-[#0f52ba] text-sm font-semibold text-white hover:bg-[#0c469f]"
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
                </Button>
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

              <form className="space-y-6" onSubmit={handleSubmit}>
                <section className="space-y-4">
                  <SectionTitle number="1">
                    Thông tin người đại diện
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

                    <FormField id="jobTitle" label="Chức vụ hiện tại" required>
                      <select
                        id="jobTitle"
                        name="jobTitle"
                        required
                        value={jobTitle}
                        onChange={(event) => setJobTitle(event.target.value)}
                        className={`${fieldClass} appearance-none`}
                      >
                        <option value="" disabled>
                          Chọn chức vụ đảm nhiệm
                        </option>
                        <option>Giám đốc / Chủ doanh nghiệp</option>
                        <option>Trưởng phòng Nhân sự</option>
                        <option>Chuyên viên Tuyển dụng</option>
                        <option>Quản lý / Trưởng bộ phận</option>
                        <option>Khác</option>
                      </select>
                    </FormField>

                    <FormField id="email" label="Email doanh nghiệp" icon={Mail} required>
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

                    <FormField id="phone" label="Số điện thoại liên hệ" icon={Phone} required>
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
                    Thông tin pháp lý &amp; hồ sơ doanh nghiệp
                  </SectionTitle>
                  <FormField
                    id="companyName"
                    label="Tên công ty đầy đủ (Theo Giấy phép ĐKKD)"
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
                    <FormField id="taxId" label="Mã số thuế (MST)" required>
                      <input
                        id="taxId"
                        name="taxId"
                        autoComplete="off"
                        maxLength={32}
                        required
                        value={taxId}
                        onChange={(event) => setTaxId(event.target.value)}
                        placeholder="0109876543"
                        className={fieldClass}
                      />
                    </FormField>

                    <FormField
                      id="industry"
                      label="Lĩnh vực hoạt động"
                      required
                    >
                      <select
                        id="industry"
                        name="industry"
                        required
                        value={industry}
                        onChange={(event) => setIndustry(event.target.value)}
                        className={`${fieldClass} appearance-none`}
                      >
                        <option value="" disabled>
                          Chọn lĩnh vực hoạt động
                        </option>
                        <option value="Công nghệ thông tin">
                          Công nghệ thông tin
                        </option>
                        <option value="Tài chính - Ngân hàng">
                          Tài chính - Ngân hàng
                        </option>
                        <option value="Thương mại - Dịch vụ">
                          Thương mại - Dịch vụ
                        </option>
                        <option value="Sản xuất - Công nghiệp">
                          Sản xuất - Công nghiệp
                        </option>
                        <option value="Giáo dục - Đào tạo">
                          Giáo dục - Đào tạo
                        </option>
                        <option value="Y tế - Chăm sóc sức khỏe">
                          Y tế - Chăm sóc sức khỏe
                        </option>
                        <option value="Lĩnh vực khác">Lĩnh vực khác</option>
                      </select>
                    </FormField>
                  </div>

                  <FormField
                    id="location"
                    label="Địa chỉ trụ sở chính (Theo Giấy phép ĐKKD)"
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

                  <div>
                    <label
                      htmlFor="description"
                      className="mb-2 block text-xs font-semibold text-[#303c50]"
                    >
                      Giới thiệu doanh nghiệp
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Mô tả ngắn về lĩnh vực hoạt động và doanh nghiệp..."
                      className="w-full resize-y rounded-lg border border-[#dfe5ef] bg-[#eff4ff] px-4 py-3 text-sm text-[#172033] outline-none transition placeholder:text-[#8b96a8] focus:border-[#0f52ba] focus:bg-white focus:ring-4 focus:ring-[#0f52ba]/10"
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <SectionTitle number="3">Mật khẩu bảo mật tài khoản</SectionTitle>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField id="password" label="Mật khẩu đăng nhập" icon={LockKeyhole} required>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Tối thiểu 8 ký tự"
                        className={`${fieldClass} pl-11 pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[#8591a4] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f52ba]"
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
                      icon={LockKeyhole}
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
                        placeholder="Nhập lại mật khẩu"
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
                  <p className="text-xs text-[#68758b]">
                    Mật khẩu cần có ít nhất 8 ký tự.
                  </p>
                </section>

                <section className="rounded-xl bg-[#eff4ff] p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <FileCheck2
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-[#0f52ba]"
                      size={20}
                    />
                    <div>
                      <h2 className="text-sm font-semibold text-[#25334b]">
                        Hồ sơ xác minh doanh nghiệp
                      </h2>
                      <p className="mt-1 text-xs leading-5 text-[#68758b]">
                        Thông tin liên hệ, mã số thuế và địa chỉ sẽ được gửi
                        cho quản trị viên để xét duyệt.
                      </p>
                      <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs leading-5 text-[#68758b]">
                        Hiện API chưa hỗ trợ tải tệp giấy phép kinh doanh. Bạn
                        có thể bổ sung giấy tờ khi tính năng lưu trữ hồ sơ được
                        tích hợp.
                      </p>
                    </div>
                  </div>
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
                        Quy chế hoạt động
                      </span>
                      ,{" "}
                      <span className="font-medium text-[#0f52ba]">
                        Chính sách bảo mật dữ liệu
                      </span>{" "}
                      của CareerLink.
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

                <Button
                  type="submit"
                  className="h-12 w-full rounded-lg bg-[#003c90] text-sm font-semibold text-white hover:bg-[#0f52ba] focus-visible:ring-[#0f52ba]"
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
                      Đăng ký tài khoản &amp; gửi yêu cầu xác minh
                      <ArrowRight
                        aria-hidden="true"
                        className="ml-2"
                        size={18}
                      />
                    </>
                  )}
                </Button>
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
