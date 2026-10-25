"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";

type CultureValue = { title: string; description: string };
type BenefitDetail = { title: string; description: string };
type Office = { label: string; address: string; city: string };

type CompanyForm = {
  name: string;
  brandName: string;
  legalName: string;
  description: string;
  website: string;
  industry: string;
  specialties: string[];
  location: string;
  address: string;
  offices: Office[];
  taxCode: string;
  contactPhone: string;
  contactEmail: string;
  companySize: string;
  coverUrl: string;
  logoUrl: string;
  galleryUrls: string[];
  benefits: string[];
  benefitsDetail: BenefitDetail[];
  cultureValues: CultureValue[];
  licenseDocumentUrl: string;
  licenseDocumentName: string;
};

const EMPTY: CompanyForm = {
  name: "",
  brandName: "",
  legalName: "",
  description: "",
  website: "",
  industry: "",
  specialties: [],
  location: "",
  address: "",
  offices: [{ label: "Trụ sở chính", address: "", city: "" }],
  taxCode: "",
  contactPhone: "",
  contactEmail: "",
  companySize: "100 - 500 nhân sự",
  coverUrl: "",
  logoUrl: "",
  galleryUrls: [],
  benefits: [],
  benefitsDetail: [],
  cultureValues: [],
  licenseDocumentUrl: "",
  licenseDocumentName: "",
};

const SIZE_OPTIONS = [
  "1 - 10 nhân sự",
  "11 - 50 nhân sự",
  "51 - 100 nhân sự",
  "100 - 500 nhân sự",
  "500 - 1,000 nhân sự",
  "1,000+ nhân sự",
];

async function uploadCompanyFile(file: File, kind: string) {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post<{ url: string; fileName: string }>(
    `/uploads/company?kind=${encodeURIComponent(kind)}`,
    form,
  );
  return response.data;
}

export default function RecruiterCompanyEditPage() {
  const router = useRouter();
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data } = await api.get<Record<string, unknown>>("/companies/me");
        if (cancelled || !data) return;
        const specialties = Array.isArray(data.specialties)
          ? (data.specialties as string[])
          : typeof data.industry === "string" && data.industry
            ? String(data.industry)
                .split(/[,/|]/)
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
        const offices = Array.isArray(data.offices) && data.offices.length
          ? (data.offices as Office[]).map((o) => ({
              label: o.label || "Văn phòng",
              address: o.address || "",
              city: o.city || "",
            }))
          : [
              {
                label: "Trụ sở chính",
                address: String(data.address || ""),
                city: String(data.location || ""),
              },
            ];
        setForm({
          name: String(data.name || ""),
          brandName: String(data.brandName || data.name || ""),
          legalName: String(data.legalName || data.name || ""),
          description: String(data.description || ""),
          website: String(data.website || ""),
          industry: String(data.industry || specialties.join(", ")),
          specialties,
          location: String(data.location || ""),
          address: String(data.address || ""),
          offices,
          taxCode: String(data.taxCode || ""),
          contactPhone: String(data.contactPhone || ""),
          contactEmail: String(data.contactEmail || ""),
          companySize: String(data.companySize || "100 - 500 nhân sự"),
          coverUrl: String(data.coverUrl || ""),
          logoUrl: String(data.logoUrl || ""),
          galleryUrls: Array.isArray(data.galleryUrls)
            ? (data.galleryUrls as string[])
            : [],
          benefits: Array.isArray(data.benefits) ? (data.benefits as string[]) : [],
          benefitsDetail: Array.isArray(data.benefitsDetail)
            ? (data.benefitsDetail as BenefitDetail[])
            : [],
          cultureValues: Array.isArray(data.cultureValues)
            ? (data.cultureValues as CultureValue[])
            : [],
          licenseDocumentUrl: String(data.licenseDocumentUrl || ""),
          licenseDocumentName: String(data.licenseDocumentName || ""),
        });
      } catch (requestError) {
        if (!cancelled) setError(formatApiError(requestError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(
    kind: "cover" | "logo" | "gallery" | "license",
    file?: File | null,
  ) {
    if (!file) return;
    setUploading(kind);
    setError("");
    try {
      const uploaded = await uploadCompanyFile(file, kind);
      if (kind === "cover") update("coverUrl", uploaded.url);
      if (kind === "logo") update("logoUrl", uploaded.url);
      if (kind === "gallery") {
        update("galleryUrls", [...form.galleryUrls, uploaded.url].slice(0, 10));
      }
      if (kind === "license") {
        update("licenseDocumentUrl", uploaded.url);
        update("licenseDocumentName", uploaded.fileName || file.name);
      }
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setUploading("");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...form,
        name: form.brandName.trim() || form.name.trim() || form.legalName.trim(),
        brandName: form.brandName.trim(),
        legalName: form.legalName.trim(),
        industry: form.specialties.join(", ") || form.industry,
        location: form.offices[0]?.city || form.location,
        address: form.offices[0]?.address || form.address,
        benefits:
          form.benefitsDetail.length > 0
            ? form.benefitsDetail.map((b) => b.title)
            : form.benefits,
      };
      await api.put("/companies/me", payload);
      setMessage("Đã lưu và công bố thay đổi hồ sơ công ty.");
      router.push("/recruiter/company");
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="px-4 py-10 text-sm text-[#68758B] sm:px-6 lg:px-8">
        Đang tải form chỉnh sửa...
      </main>
    );
  }

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/recruiter/company"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F52BA]"
          >
            <ArrowLeft size={14} /> Hồ sơ công ty
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#0B1C30]">
            Chỉnh sửa Hồ sơ công ty
          </h1>
          <span className="mt-1 inline-flex rounded-full bg-[#EFF4FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#003C90]">
            Chế độ chỉnh sửa
          </span>
        </div>
        <div className="flex gap-2">
          <Link
            href="/recruiter/company"
            className="inline-flex h-11 items-center rounded-xl border border-[#D7E0EE] px-4 text-sm font-semibold text-[#44506A]"
          >
            Hủy
          </Link>
          <button
            type="submit"
            form="company-edit-form"
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#003C90] px-4 text-sm font-semibold text-white hover:bg-[#0F52BA] disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <form
        id="company-edit-form"
        onSubmit={handleSubmit}
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]"
      >
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-[#0B1C30]">
              1. Nhận diện thương hiệu & Thông tin cơ bản
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-[#0B1C30]">Ảnh cover</span>
                {form.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.coverUrl} alt="" className="mb-2 h-28 w-full rounded-xl object-cover" />
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleUpload("cover", e.target.files?.[0])}
                  className="block w-full text-xs"
                />
                {uploading === "cover" ? (
                  <span className="text-xs text-[#68758B]">Đang tải...</span>
                ) : null}
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-[#0B1C30]">Logo</span>
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoUrl} alt="" className="mb-2 h-20 w-20 rounded-xl object-cover" />
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleUpload("logo", e.target.files?.[0])}
                  className="block w-full text-xs"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Tên pháp lý">
                <input
                  value={form.legalName}
                  onChange={(e) => update("legalName", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Tên thương hiệu hiển thị *">
                <input
                  required
                  value={form.brandName}
                  onChange={(e) => update("brandName", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Quy mô">
                <select
                  value={form.companySize}
                  onChange={(e) => update("companySize", e.target.value)}
                  className={inputClass}
                >
                  {SIZE_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Website">
                <input
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                  className={inputClass}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Email liên hệ">
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => update("contactEmail", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Hotline">
                <input
                  value={form.contactPhone}
                  onChange={(e) => update("contactPhone", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Mã số thuế">
                <input
                  value={form.taxCode}
                  onChange={(e) => update("taxCode", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="mt-4">
              <p className="mb-1.5 text-sm font-medium text-[#0B1C30]">Lĩnh vực chuyên môn</p>
              <div className="flex flex-wrap gap-2">
                {form.specialties.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      update(
                        "specialties",
                        form.specialties.filter((s) => s !== item),
                      )
                    }
                    className="rounded-lg bg-[#EFF4FF] px-2.5 py-1 text-xs font-medium text-[#003C90]"
                  >
                    {item} ×
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  className={inputClass}
                  placeholder="Thêm lĩnh vực rồi Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const value = specialtyInput.trim();
                      if (value && !form.specialties.includes(value)) {
                        update("specialties", [...form.specialties, value]);
                      }
                      setSpecialtyInput("");
                    }
                  }}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-[#0B1C30]">
              2. Giới thiệu & Giá trị văn hóa
            </h2>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={5}
              className={`${inputClass} mt-3`}
              placeholder="Sứ mệnh / giới thiệu công ty..."
            />
            <div className="mt-4 space-y-3">
              {form.cultureValues.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-[#E8ECF4] p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={item.title}
                    onChange={(e) => {
                      const next = [...form.cultureValues];
                      next[index] = { ...item, title: e.target.value };
                      update("cultureValues", next);
                    }}
                    className={inputClass}
                    placeholder="Tiêu đề giá trị"
                  />
                  <input
                    value={item.description}
                    onChange={(e) => {
                      const next = [...form.cultureValues];
                      next[index] = { ...item, description: e.target.value };
                      update("cultureValues", next);
                    }}
                    className={inputClass}
                    placeholder="Mô tả ngắn"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        "cultureValues",
                        form.cultureValues.filter((_, i) => i !== index),
                      )
                    }
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[#FECACA] text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update("cultureValues", [
                    ...form.cultureValues,
                    { title: "", description: "" },
                  ])
                }
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#0F52BA]"
              >
                <Plus size={14} /> Thêm giá trị văn hóa
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-[#0B1C30]">3. Địa điểm & Văn phòng</h2>
            <div className="mt-3 space-y-3">
              {form.offices.map((office, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-[#E8ECF4] p-3 sm:grid-cols-3">
                  <input
                    value={office.label}
                    onChange={(e) => {
                      const next = [...form.offices];
                      next[index] = { ...office, label: e.target.value };
                      update("offices", next);
                    }}
                    className={inputClass}
                    placeholder="Nhãn (Trụ sở / Chi nhánh)"
                  />
                  <input
                    value={office.city}
                    onChange={(e) => {
                      const next = [...form.offices];
                      next[index] = { ...office, city: e.target.value };
                      update("offices", next);
                    }}
                    className={inputClass}
                    placeholder="Thành phố"
                  />
                  <div className="flex gap-2">
                    <input
                      value={office.address}
                      onChange={(e) => {
                        const next = [...form.offices];
                        next[index] = { ...office, address: e.target.value };
                        update("offices", next);
                      }}
                      className={inputClass}
                      placeholder="Địa chỉ chi tiết"
                    />
                    {form.offices.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          update(
                            "offices",
                            form.offices.filter((_, i) => i !== index),
                          )
                        }
                        className="rounded-xl border border-[#FECACA] px-3 text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update("offices", [
                    ...form.offices,
                    { label: "Chi nhánh", address: "", city: "" },
                  ])
                }
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#0F52BA]"
              >
                <Plus size={14} /> Thêm văn phòng
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-[#0B1C30]">4. Phúc lợi nổi bật</h2>
            <div className="mt-3 space-y-3">
              {form.benefitsDetail.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-[#E8ECF4] p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={item.title}
                    onChange={(e) => {
                      const next = [...form.benefitsDetail];
                      next[index] = { ...item, title: e.target.value };
                      update("benefitsDetail", next);
                    }}
                    className={inputClass}
                    placeholder="Tên phúc lợi"
                  />
                  <input
                    value={item.description}
                    onChange={(e) => {
                      const next = [...form.benefitsDetail];
                      next[index] = { ...item, description: e.target.value };
                      update("benefitsDetail", next);
                    }}
                    className={inputClass}
                    placeholder="Mô tả"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        "benefitsDetail",
                        form.benefitsDetail.filter((_, i) => i !== index),
                      )
                    }
                    className="rounded-xl border border-[#FECACA] px-3 text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update("benefitsDetail", [
                    ...form.benefitsDetail,
                    { title: "", description: "" },
                  ])
                }
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#0F52BA]"
              >
                <Plus size={14} /> Thêm phúc lợi
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-[#0B1C30]">
              5. Thư viện ảnh môi trường (tối đa 10)
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {form.galleryUrls.map((url) => (
                <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        "galleryUrls",
                        form.galleryUrls.filter((item) => item !== url),
                      )
                    }
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {form.galleryUrls.length < 10 ? (
                <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#C5D0E0] text-xs text-[#68758B]">
                  <ImagePlus size={18} />
                  {uploading === "gallery" ? "Đang tải..." : "Upload ảnh"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleUpload("gallery", e.target.files?.[0])}
                  />
                </label>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#0B1C30]">Hồ sơ pháp lý</h3>
            {form.licenseDocumentUrl ? (
              <a
                href={form.licenseDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block truncate text-sm font-medium text-[#0F52BA]"
              >
                {form.licenseDocumentName || "Giấy phép đã tải"}
              </a>
            ) : (
              <p className="mt-2 text-xs text-[#8793a6]">Chưa có GPKD.</p>
            )}
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#D7E0EE] px-3 py-2 text-xs font-semibold text-[#003C90]">
              <Upload size={14} />
              {uploading === "license" ? "Đang tải..." : "Tải GPKD (PDF/ảnh)"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => void handleUpload("license", e.target.files?.[0])}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#003C90] text-sm font-semibold text-white hover:bg-[#0F52BA] disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Đang lưu..." : "Lưu và công bố thay đổi"}
          </button>
        </aside>
      </form>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-[#0B1C30]">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-[#E4EAF3] bg-[#F8FAFD] px-3 text-sm text-[#0B1C30] outline-none transition focus:border-[#0F52BA]/40 focus:bg-white focus:ring-2 focus:ring-[#0F52BA]/15";
