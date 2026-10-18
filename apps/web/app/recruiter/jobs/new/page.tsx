"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  Headphones,
  Info,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { formatSalaryRange } from "@/lib/format";

type AuthMe = {
  fullName: string;
  email: string;
};

type CompanyMe = {
  name?: string | null;
  address?: string | null;
  location?: string | null;
  contactPhone?: string | null;
  industry?: string | null;
};

type FormState = {
  title: string;
  category: string;
  level: string;
  employmentType: string;
  workMode: string;
  headcount: string;
  expiresAt: string;
  location: string;
  salaryNegotiable: boolean;
  salaryMinTr: string;
  salaryMaxTr: string;
  description: string;
  skillInput: string;
  skills: string[];
  benefits: string;
};

const DRAFT_KEY = "talenthub.recruiter.job-draft";

const DEPARTMENTS = [
  "Kỹ thuật phần mềm (Engineering)",
  "Sản phẩm (Product)",
  "Dữ liệu & AI",
  "Marketing & Growth",
  "Nhân sự & Talent",
  "Tài chính - Fintech",
  "Vận hành / Operations",
];

const LEVELS: Array<{
  value: string;
  label: string;
  experienceMin: number;
  experienceMax: number;
}> = [
  {
    value: "INTERN",
    label: "Intern / Fresher (0 - 1 năm)",
    experienceMin: 0,
    experienceMax: 1,
  },
  {
    value: "JUNIOR",
    label: "Junior (0 - 2 năm)",
    experienceMin: 0,
    experienceMax: 2,
  },
  {
    value: "MID",
    label: "Mid-level (2 - 4 năm)",
    experienceMin: 2,
    experienceMax: 4,
  },
  {
    value: "SENIOR",
    label: "Senior - Tech Lead (4 - 7+ năm)",
    experienceMin: 4,
    experienceMax: 7,
  },
  {
    value: "PRINCIPAL",
    label: "Principal / Manager (7+ năm)",
    experienceMin: 7,
    experienceMax: 15,
  },
];

const EMPLOYMENT_OPTIONS = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "CONTRACT", label: "Contract" },
];

const WORK_MODE_OPTIONS = [
  { value: "ONSITE", label: "100% Onsite" },
  { value: "HYBRID", label: "Hybrid · 2-3 ngày WFH/tuần" },
  { value: "REMOTE", label: "100% Remote" },
];

const EMPTY_FORM: FormState = {
  title: "",
  category: DEPARTMENTS[0],
  level: "SENIOR",
  employmentType: "FULL_TIME",
  workMode: "HYBRID",
  headcount: "1",
  expiresAt: "",
  location: "",
  salaryNegotiable: false,
  salaryMinTr: "",
  salaryMaxTr: "",
  description: "",
  skillInput: "",
  skills: [],
  benefits: "",
};

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
              active
                ? "border-[#003C90] bg-[#EFF4FF] text-[#003C90]"
                : "border-[#D7E0EE] bg-white text-[#44506A] hover:border-[#A8B8D0]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm shadow-[#0B1C30]/[0.02]">
      <div className="mb-4 flex items-center gap-3 border-b border-[#EEF2F7] pb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#003C90] text-xs font-bold text-white">
          {step}
        </span>
        <h2 className="text-sm font-bold text-[#0B1C30]">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-[#0B1C30]">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-[#8793a6]">{hint}</span>}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 text-sm text-[#0B1C30] outline-none transition focus:border-[#003C90] focus:bg-white";
const textareaClass =
  "w-full rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 py-2.5 text-sm text-[#0B1C30] outline-none transition focus:border-[#003C90] focus:bg-white";

export default function CreateJobPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [me, setMe] = useState<AuthMe | null>(null);
  const [company, setCompany] = useState<CompanyMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      try {
        const [meRes, companyRes] = await Promise.all([
          api.get<AuthMe>("/auth/me"),
          api.get<CompanyMe>("/companies/me").catch(() => null),
        ]);
        if (cancelled) return;
        setMe(meRes.data);
        const companyData = companyRes?.data ?? null;
        setCompany(companyData);

        let draft: FormState | null = null;
        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          if (raw) draft = JSON.parse(raw) as FormState;
        } catch {
          draft = null;
        }

        if (draft) {
          setForm(draft);
          setMessage("Đã khôi phục bản nháp đã lưu trên thiết bị này.");
        } else {
          setForm((prev) => ({
            ...prev,
            location:
              companyData?.address ||
              companyData?.location ||
              prev.location,
            category:
              companyData?.industry &&
              DEPARTMENTS.some((item) => item.includes(companyData.industry!))
                ? DEPARTMENTS.find((item) =>
                    item.includes(companyData.industry!),
                  ) ?? prev.category
                : prev.category,
          }));
        }
      } catch (requestError) {
        if (!cancelled) setError(formatApiError(requestError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const levelMeta = useMemo(
    () => LEVELS.find((item) => item.value === form.level) ?? LEVELS[3],
    [form.level],
  );

  const salaryPreview = useMemo(() => {
    if (form.salaryNegotiable) return "Thỏa thuận";
    const min = form.salaryMinTr ? Number(form.salaryMinTr) * 1_000_000 : null;
    const max = form.salaryMaxTr ? Number(form.salaryMaxTr) * 1_000_000 : null;
    return formatSalaryRange(min, max);
  }, [form.salaryNegotiable, form.salaryMinTr, form.salaryMaxTr]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addSkill(raw?: string) {
    const value = (raw ?? form.skillInput).trim();
    if (!value) return;
    if (form.skills.includes(value)) {
      update("skillInput", "");
      return;
    }
    setForm((prev) => ({
      ...prev,
      skills: [...prev.skills, value],
      skillInput: "",
    }));
  }

  function onSkillKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSkill();
    }
    if (event.key === "Backspace" && !form.skillInput && form.skills.length) {
      setForm((prev) => ({
        ...prev,
        skills: prev.skills.slice(0, -1),
      }));
    }
  }

  function saveDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    setMessage("Đã lưu bản nháp trên trình duyệt này.");
    setError("");
  }

  function buildPayload() {
    const headcount = Math.max(1, Number(form.headcount) || 1);
    const salaryMin = form.salaryNegotiable
      ? undefined
      : form.salaryMinTr
        ? Number(form.salaryMinTr) * 1_000_000
        : undefined;
    const salaryMax = form.salaryNegotiable
      ? undefined
      : form.salaryMaxTr
        ? Number(form.salaryMaxTr) * 1_000_000
        : undefined;
    const requirements =
      form.skills.length > 0
        ? `Kỹ năng bắt buộc:\n${form.skills.map((s) => `- ${s}`).join("\n")}`
        : undefined;
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      requirements,
      benefits: form.benefits.trim() || undefined,
      location: form.location.trim(),
      category: form.category.trim() || undefined,
      level: levelMeta.label,
      headcount,
      skills: form.skills,
      employmentType: form.employmentType,
      workMode: form.workMode,
      experienceMin: levelMeta.experienceMin,
      experienceMax: levelMeta.experienceMax,
      salaryMin,
      salaryMax,
      salaryNegotiable: form.salaryNegotiable,
      currency: "VND",
      expiresAt: form.expiresAt || undefined,
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
        throw new Error("Vui lòng điền tiêu đề, mô tả và địa điểm làm việc.");
      }
      if (
        !form.salaryNegotiable &&
        form.salaryMinTr &&
        form.salaryMaxTr &&
        Number(form.salaryMinTr) > Number(form.salaryMaxTr)
      ) {
        throw new Error("Mức lương tối thiểu không được lớn hơn mức tối đa.");
      }
      await api.post("/jobs", buildPayload());
      localStorage.removeItem(DRAFT_KEY);
      setMessage("Đã gửi tin — đang chờ Admin kiểm duyệt.");
      router.push("/recruiter/jobs?status=PENDING");
    } catch (requestError) {
      setError(
        requestError instanceof Error && /[à-ỹđ]/i.test(requestError.message)
          ? requestError.message
          : formatApiError(requestError),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <p className="px-4 py-16 text-center text-sm text-[#68758B]">
        Đang tải biểu mẫu đăng tin...
      </p>
    );
  }

  return (
    <div className="relative pb-28">
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/recruiter/jobs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#68758B] hover:text-[#003C90]"
            >
              <ArrowLeft size={14} /> Quay lại danh sách tin
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0B1C30]">
              Tạo tin tuyển dụng mới
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#68758B]">
              Điền thông tin minh bạch để Admin duyệt nhanh. Tin sẽ ở trạng thái{" "}
              <span className="font-semibold text-[#B54708]">PENDING</span> sau
              khi gửi.
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </p>
        )}

        <form
          id="create-job-form"
          onSubmit={handleSubmit}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"
        >
          <div className="space-y-4">
            <SectionCard step={1} title="Thông tin cơ bản vị trí">
              <Field label="Tiêu đề vị trí *">
                <input
                  required
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  className={inputClass}
                  placeholder="Senior Backend Engineer (Go / Distributed Systems)"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phòng ban / Đơn vị">
                  <select
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                    className={inputClass}
                  >
                    {DEPARTMENTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Cấp bậc chuyên môn">
                  <select
                    value={form.level}
                    onChange={(e) => update("level", e.target.value)}
                    className={inputClass}
                  >
                    {LEVELS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Hình thức làm việc">
                <ChipGroup
                  options={EMPLOYMENT_OPTIONS}
                  value={form.employmentType}
                  onChange={(value) => update("employmentType", value)}
                />
              </Field>
              <Field label="Chế độ môi trường làm việc">
                <ChipGroup
                  options={WORK_MODE_OPTIONS}
                  value={form.workMode}
                  onChange={(value) => update("workMode", value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Số lượng cần tuyển">
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={form.headcount}
                    onChange={(e) => update("headcount", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Hạn nhận hồ sơ">
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => update("expiresAt", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard step={2} title="Địa điểm & Mức thu nhập minh bạch">
              <Field label="Trụ sở / địa điểm làm việc *">
                <input
                  required
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  className={inputClass}
                  placeholder="Trụ sở chính: Tầng 38 Landmark 81, TP.HCM"
                />
              </Field>
              <div className="rounded-xl border border-[#E4EAF3] bg-[#F7F9FC] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[#0B1C30]">
                    Khung thu nhập hàng tháng (Tr. VND)
                  </p>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#44506A]">
                    <input
                      type="checkbox"
                      checked={form.salaryNegotiable}
                      onChange={(e) =>
                        update("salaryNegotiable", e.target.checked)
                      }
                      className="h-4 w-4 rounded border-[#D7E0EE] text-[#003C90]"
                    />
                    Thỏa thuận
                  </label>
                </div>
                {!form.salaryNegotiable && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={form.salaryMinTr}
                      onChange={(e) => update("salaryMinTr", e.target.value)}
                      className={inputClass}
                      placeholder="Min · VD: 40"
                    />
                    <span className="flex items-center justify-center text-xs font-semibold text-[#8793a6]">
                      →
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={form.salaryMaxTr}
                      onChange={(e) => update("salaryMaxTr", e.target.value)}
                      className={inputClass}
                      placeholder="Max · VD: 60"
                    />
                  </div>
                )}
                <p className="mt-2 text-[11px] text-[#8793a6]">
                  Xem trước: {salaryPreview}
                </p>
              </div>
            </SectionCard>

            <SectionCard step={3} title="Mô tả công việc & Yêu cầu ứng viên">
              <Field
                label="Trách nhiệm chính *"
                hint="Mô tả rõ deliverable, stack và phạm vi công việc."
              >
                <textarea
                  required
                  rows={7}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className={textareaClass}
                  placeholder={
                    "• Thiết kế dịch vụ Go phân tán\n• Tối ưu PostgreSQL / Kafka\n• Triển khai Kubernetes, Clean Architecture / DDD"
                  }
                />
              </Field>
              <Field
                label="Kỹ năng bắt buộc"
                hint="Nhập rồi Enter hoặc dấu phẩy để thêm tag."
              >
                <div className="rounded-xl border border-[#D7E0EE] bg-[#F7F9FC] px-3 py-2 focus-within:border-[#003C90] focus-within:bg-white">
                  <div className="flex flex-wrap gap-1.5">
                    {form.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#003C90]"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              skills: prev.skills.filter((s) => s !== skill),
                            }))
                          }
                          className="text-[#68758B] hover:text-[#B42318]"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input
                      value={form.skillInput}
                      onChange={(e) => update("skillInput", e.target.value)}
                      onKeyDown={onSkillKeyDown}
                      onBlur={() => addSkill()}
                      className="min-w-[140px] flex-1 bg-transparent py-1 text-sm outline-none"
                      placeholder="Go, Kafka, Docker..."
                    />
                  </div>
                </div>
              </Field>
              <Field label="Phúc lợi & đãi ngộ">
                <textarea
                  rows={5}
                  value={form.benefits}
                  onChange={(e) => update("benefits", e.target.value)}
                  className={textareaClass}
                  placeholder={
                    "• Lương tháng 13 + KPI bonus\n• Bảo hiểm VIP\n• MacBook Pro / Dell Precision\n• 18 ngày phép/năm"
                  }
                />
              </Field>
            </SectionCard>

            <SectionCard step={4} title="Người phụ trách tiếp nhận">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E4EAF3] bg-[#F7F9FC] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#003C90] text-sm font-bold text-white">
                    {(me?.fullName ?? "NT")
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(-2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0B1C30]">
                      {me?.fullName ?? "Nhà tuyển dụng"}
                    </p>
                    <p className="text-xs text-[#68758B]">
                      {company?.name
                        ? `Talent Acquisition · ${company.name}`
                        : "Lead Talent Acquisition"}
                    </p>
                    <p className="mt-1 text-[11px] text-[#8793a6]">
                      {me?.email}
                      {company?.contactPhone
                        ? ` · ${company.contactPhone}`
                        : ""}
                    </p>
                  </div>
                </div>
                <Link
                  href="/recruiter/company"
                  className="text-xs font-semibold text-[#003C90] hover:underline"
                >
                  Thay đổi chuyên viên / hồ sơ công ty
                </Link>
              </div>
            </SectionCard>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <div className="rounded-2xl border border-[#E4EAF3] bg-white p-5">
              <div className="flex items-center gap-2 text-[#003C90]">
                <ShieldCheck size={16} />
                <h3 className="text-sm font-bold">Chính sách kiểm duyệt</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#68758B]">
                Tin được Admin rà soát theo chuẩn chất lượng và minh bạch thu
                nhập trước khi hiển thị công khai trên TalentHub.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#44506A]">
                <li className="flex items-start gap-2">
                  <Clock3 size={14} className="mt-0.5 shrink-0 text-[#B54708]" />
                  <span>
                    Giờ duyệt: <strong>8:00 – 21:00</strong> hàng ngày
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Info size={14} className="mt-0.5 shrink-0 text-[#003C90]" />
                  <span>
                    Cam kết SLA tối đa <strong>120 phút</strong> trong giờ làm
                    việc
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#E4EAF3] bg-white p-5">
              <div className="flex items-center gap-2 text-[#006A61]">
                <Headphones size={16} />
                <h3 className="text-sm font-bold">Cần hỗ trợ?</h3>
              </div>
              <p className="mt-2 text-xs text-[#68758B]">
                Đội ngũ Success hỗ trợ soạn JD và tối ưu tỷ lệ duyệt vòng 1.
              </p>
              <p className="mt-3 text-sm font-bold text-[#0B1C30]">
                Hotline: 1900 6868
              </p>
            </div>
          </aside>
        </form>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E4EAF3] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="max-w-md text-[11px] text-[#68758B]">
            Hệ thống sẽ gửi email thông báo khi Admin hoàn tất kiểm duyệt tin
            tuyển dụng của bạn.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveDraft}
              className="h-10 rounded-xl border border-[#D7E0EE] bg-white px-3 text-xs font-semibold text-[#0B1C30]"
            >
              Lưu bản nháp
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="h-10 rounded-xl border border-[#D7E0EE] bg-white px-3 text-xs font-semibold text-[#0B1C30]"
            >
              Xem trước giao diện
            </button>
            <button
              type="submit"
              form="create-job-form"
              disabled={submitting}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#003C90] px-4 text-xs font-semibold text-white shadow-sm shadow-[#003C90]/25 disabled:opacity-60"
            >
              <Plus size={14} />
              {submitting
                ? "Đang gửi..."
                : "Gửi tin chờ Admin kiểm duyệt"}
            </button>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1C30]/45 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4EAF3] px-5 py-4">
              <h3 className="text-base font-bold text-[#0B1C30]">
                Xem trước tin tuyển dụng
              </h3>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D7E0EE]"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <p className="text-lg font-bold text-[#0B1C30]">
                {form.title || "Chưa có tiêu đề"}
              </p>
              <p className="text-xs text-[#68758B]">
                {company?.name ?? "Công ty"} · {form.location || "—"} ·{" "}
                {WORK_MODE_OPTIONS.find((o) => o.value === form.workMode)?.label}
              </p>
              <p className="text-sm font-semibold text-[#003C90]">
                {salaryPreview}
              </p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#44506A]">
                {form.description || "Chưa có mô tả."}
              </p>
              {form.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#003C90]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              {form.benefits && (
                <div>
                  <p className="text-xs font-bold text-[#0B1C30]">Phúc lợi</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-[#44506A]">
                    {form.benefits}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
