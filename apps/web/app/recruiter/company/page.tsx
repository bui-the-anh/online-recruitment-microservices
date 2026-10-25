"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  FileText,
  Globe,
  Heart,
  ImageIcon,
  Laptop,
  MapPin,
  Pencil,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { companyInitials, logoColor } from "@/lib/format";

type CultureValue = { title: string; description?: string };
type BenefitDetail = { title: string; description?: string };
type Office = { label?: string; address?: string; city?: string };

type Company = {
  id: string;
  name: string;
  brandName?: string | null;
  legalName?: string | null;
  description: string | null;
  website: string | null;
  industry: string | null;
  specialties?: string[];
  location: string | null;
  address: string | null;
  offices?: Office[];
  taxCode: string | null;
  contactPhone: string | null;
  contactEmail?: string | null;
  companySize: string | null;
  coverUrl: string | null;
  logoUrl?: string | null;
  galleryUrls?: string[];
  benefits?: string[];
  benefitsDetail?: BenefitDetail[];
  cultureValues?: CultureValue[];
  licenseDocumentUrl: string | null;
  licenseDocumentName: string | null;
  responseRate?: number | null;
  rating?: number | null;
  verified?: boolean;
  completionScore?: number;
  completion?: Record<string, boolean>;
  recruiter?: {
    verificationStatus?: string | null;
    email?: string;
  };
};

const CULTURE_ICONS = [Zap, Sparkles, Users, Heart];
const BENEFIT_ICONS = [Wallet, BadgeCheck, Laptop, Building2];

export default function RecruiterCompanyPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await api.get<Company>("/companies/me");
        if (!cancelled) setCompany(response.data);
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

  const displayName = company?.brandName || company?.name || "Công ty";
  const specialties = useMemo(() => {
    if (!company) return [] as string[];
    if (company.specialties?.length) return company.specialties;
    return company.industry ? company.industry.split(/[,/|]/).map((s) => s.trim()).filter(Boolean) : [];
  }, [company]);

  const benefits = useMemo(() => {
    if (!company) return [] as BenefitDetail[];
    if (company.benefitsDetail?.length) return company.benefitsDetail;
    return (company.benefits || []).map((title) => ({ title }));
  }, [company]);

  const offices = useMemo(() => {
    if (!company) return [] as Office[];
    if (company.offices?.length) return company.offices;
    if (company.address || company.location) {
      return [
        {
          label: "Trụ sở chính",
          address: company.address || company.location || "",
          city: company.location || "",
        },
      ];
    }
    return [];
  }, [company]);

  const gallery = company?.galleryUrls || [];
  const culture = company?.cultureValues || [];

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1C30]">Hồ sơ công ty</h1>
          <p className="mt-1 text-sm text-[#68758B]">
            Thông tin doanh nghiệp hiển thị trên TalentHub.
          </p>
        </div>
        {company ? (
          <Link
            href="/recruiter/company/edit"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#003C90] px-4 text-sm font-semibold text-white hover:bg-[#0F52BA]"
          >
            <Pencil size={16} />
            Chỉnh sửa hồ sơ công ty
          </Link>
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[#68758B]">Đang tải hồ sơ công ty...</p>
      ) : !company ? (
        <div className="rounded-2xl border border-dashed border-[#E4EAF3] bg-white px-4 py-10 text-center text-sm text-[#8793a6]">
          Chưa có hồ sơ công ty.{" "}
          <Link href="/recruiter/company/edit" className="font-semibold text-[#0F52BA]">
            Tạo hồ sơ ngay
          </Link>
          .
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            {company.verified ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <BadgeCheck size={16} />
                Doanh nghiệp đã được xác minh trên TalentHub.
              </div>
            ) : null}

            <section className="overflow-hidden rounded-2xl border border-[#E4EAF3] bg-white shadow-sm">
              <div
                className="relative h-44 bg-gradient-to-r from-[#003C90] to-[#006A61] sm:h-56"
                style={
                  company.coverUrl
                    ? {
                        backgroundImage: `url(${company.coverUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              />
              <div className="relative px-5 pb-5 pt-0 sm:px-6">
                <div className="-mt-10 flex flex-wrap items-end gap-4">
                  <div
                    className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white text-xl font-bold text-white shadow-md"
                    style={{
                      backgroundColor: company.logoUrl
                        ? "#fff"
                        : logoColor(displayName),
                    }}
                  >
                    {company.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={company.logoUrl}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      companyInitials(displayName)
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-[#0B1C30]">
                        {displayName}
                      </h2>
                      {company.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F8F2] px-2.5 py-0.5 text-[11px] font-semibold text-[#006A61]">
                          <BadgeCheck size={12} /> Đã xác thực
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#FFF4E5] px-2.5 py-0.5 text-[11px] font-semibold text-[#B54708]">
                          Chờ xác minh
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#8793a6]">
                      {company.legalName || company.name}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {company.companySize ? (
                    <span className="rounded-lg bg-[#F3F6FB] px-2.5 py-1 text-xs font-medium text-[#44506A]">
                      {company.companySize}
                    </span>
                  ) : null}
                  {specialties.map((item) => (
                    <span
                      key={item}
                      className="rounded-lg bg-[#EFF4FF] px-2.5 py-1 text-xs font-medium text-[#003C90]"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid gap-2 text-sm text-[#44506A] sm:grid-cols-2">
                  {company.website ? (
                    <a
                      href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 font-medium text-[#0F52BA]"
                    >
                      <Globe size={14} /> {company.website}
                    </a>
                  ) : null}
                  {(company.contactEmail || company.recruiter?.email) && (
                    <p className="inline-flex items-center gap-2">
                      <Users size={14} className="text-[#8793a6]" />
                      {company.contactEmail || company.recruiter?.email}
                    </p>
                  )}
                  {company.contactPhone ? (
                    <p className="inline-flex items-center gap-2">
                      Hotline: {company.contactPhone}
                    </p>
                  ) : null}
                  {company.taxCode ? (
                    <p className="inline-flex items-center gap-2 text-[#8793a6]">
                      MST: {company.taxCode}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8793a6]">
                02 · Giới thiệu & văn hóa
              </p>
              <h3 className="mt-1 text-lg font-bold text-[#0B1C30]">
                Giới thiệu doanh nghiệp & Giá trị văn hóa
              </h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#44506A]">
                {company.description || "Chưa có nội dung giới thiệu."}
              </p>
              {culture.length > 0 ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {culture.map((item, index) => {
                    const Icon = CULTURE_ICONS[index % CULTURE_ICONS.length];
                    return (
                      <div
                        key={`${item.title}-${index}`}
                        className="rounded-xl border border-[#E8ECF4] bg-[#F8FAFD] p-4"
                      >
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#003C90]">
                          <Icon size={16} />
                        </div>
                        <p className="text-sm font-semibold text-[#0B1C30]">
                          {item.title}
                        </p>
                        {item.description ? (
                          <p className="mt-1 text-xs leading-5 text-[#68758B]">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8793a6]">
                03 · Địa điểm
              </p>
              <h3 className="mt-1 text-lg font-bold text-[#0B1C30]">
                Địa điểm làm việc & Văn phòng đại diện
              </h3>
              <div className="mt-4 space-y-3">
                {offices.length === 0 ? (
                  <p className="text-sm text-[#8793a6]">Chưa cập nhật địa điểm.</p>
                ) : (
                  offices.map((office, index) => (
                    <div
                      key={`${office.label}-${index}`}
                      className="flex items-start gap-3 rounded-xl border border-[#E8ECF4] px-4 py-3"
                    >
                      <MapPin size={16} className="mt-0.5 text-[#003C90]" />
                      <div>
                        <p className="text-sm font-semibold text-[#0B1C30]">
                          {office.label || `Văn phòng ${index + 1}`}
                        </p>
                        <p className="text-xs text-[#68758B]">
                          {[office.address, office.city].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8793a6]">
                04 · Phúc lợi
              </p>
              <h3 className="mt-1 text-lg font-bold text-[#0B1C30]">
                Chế độ đãi ngộ & Phúc lợi nổi bật
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {benefits.length === 0 ? (
                  <p className="text-sm text-[#8793a6]">Chưa có phúc lợi.</p>
                ) : (
                  benefits.map((item, index) => {
                    const Icon = BENEFIT_ICONS[index % BENEFIT_ICONS.length];
                    return (
                      <div
                        key={`${item.title}-${index}`}
                        className="rounded-xl border border-[#E8ECF4] bg-[#F8FAFD] p-4"
                      >
                        <Icon size={16} className="text-[#003C90]" />
                        <p className="mt-2 text-sm font-semibold text-[#0B1C30]">
                          {item.title}
                        </p>
                        {item.description ? (
                          <p className="mt-1 text-xs text-[#68758B]">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8793a6]">
                05 · Thư viện
              </p>
              <h3 className="mt-1 text-lg font-bold text-[#0B1C30]">
                Thư viện hình ảnh môi trường làm việc
              </h3>
              {gallery.length === 0 ? (
                <p className="mt-4 text-sm text-[#8793a6]">Chưa có ảnh gallery.</p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {gallery.map((url) => (
                    <div
                      key={url}
                      className="aspect-[4/3] overflow-hidden rounded-xl bg-[#F3F6FB]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-[#0B1C30]">Hồ sơ pháp lý</p>
              {company.licenseDocumentUrl ? (
                <a
                  href={company.licenseDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center gap-3 rounded-xl border border-[#E8ECF4] px-3 py-3 text-sm text-[#0F52BA] hover:bg-[#F8FAFD]"
                >
                  <FileText size={16} />
                  <span className="truncate">
                    {company.licenseDocumentName || "Giấy phép kinh doanh"}
                  </span>
                </a>
              ) : (
                <p className="mt-3 text-xs text-[#8793a6]">Chưa tải GPKD.</p>
              )}
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-[#44506A]">Độ hoàn thiện</span>
                  <span className="font-bold text-[#003C90]">
                    {company.completionScore ?? 0}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#E8ECF4]">
                  <div
                    className="h-full rounded-full bg-[#003C90]"
                    style={{ width: `${company.completionScore ?? 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-[#0B1C30]">Chỉ số TalentHub</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-[#68758B]">Tỷ lệ phản hồi</span>
                  <span className="font-semibold text-[#0B1C30]">
                    {company.responseRate != null
                      ? `${company.responseRate}%`
                      : "—"}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-[#68758B]">Đánh giá</span>
                  <span className="font-semibold text-[#0B1C30]">
                    {company.rating != null ? `${company.rating}/5` : "—"}
                  </span>
                </p>
              </div>
              <Link
                href="/recruiter/company/edit"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#D7E0EE] px-3 py-2.5 text-sm font-semibold text-[#003C90] hover:bg-[#F8FAFD]"
              >
                <ImageIcon size={14} /> Cập nhật hình ảnh
              </Link>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
