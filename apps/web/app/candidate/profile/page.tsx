"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Bell,
  Briefcase,
  ChevronRight,
  FileText,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Share2,
  Shield,
  Star,
  Wallet,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { formatSalaryRange } from "@/lib/format";

type ProfileResponse = {
  id: string;
  phone: string | null;
  location: string | null;
  headline: string | null;
  bio: string | null;
  experienceYears: string | number | null;
  level: string | null;
  expectedSalaryMin: string | number | null;
  expectedSalaryMax: string | number | null;
  workPreference: string | null;
  skills: string[] | null;
  skillLevels: Array<{ name: string; percent: number }> | null;
  updatedAt: string;
  applicationsCount?: number;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
};

function relativeUpdated(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const hours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
  if (hours < 24) return `Cập nhật ${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `Cập nhật ${days} ngày trước`;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function CandidateProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [level, setLevel] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [workPreference, setWorkPreference] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [newSkill, setNewSkill] = useState("");

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<ProfileResponse>("/candidate/profile");
      const data = response.data;
      setProfile(data);
      setFullName(data.user.fullName);
      setHeadline(data.headline ?? "");
      setPhone(data.phone ?? "");
      setLocation(data.location ?? "");
      setBio(data.bio ?? "");
      setExperienceYears(
        data.experienceYears !== null && data.experienceYears !== undefined
          ? String(data.experienceYears)
          : "",
      );
      setLevel(data.level ?? "");
      setSalaryMin(
        data.expectedSalaryMin != null ? String(data.expectedSalaryMin) : "",
      );
      setSalaryMax(
        data.expectedSalaryMax != null ? String(data.expectedSalaryMax) : "",
      );
      setWorkPreference(data.workPreference ?? "");
      setSkillsText((data.skills ?? []).join(", "));
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  const initials = useMemo(() => {
    if (!profile) return "UV";
    return profile.user.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [profile]);

  const skills = useMemo(
    () =>
      skillsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [skillsText],
  );

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.patch("/candidate/profile", {
        fullName: fullName.trim(),
        headline: headline.trim(),
        phone: phone.trim(),
        location: location.trim(),
        bio: bio.trim(),
        experienceYears: experienceYears
          ? Number(experienceYears)
          : undefined,
        level: level.trim(),
        expectedSalaryMin: salaryMin ? Number(salaryMin) : undefined,
        expectedSalaryMax: salaryMax ? Number(salaryMax) : undefined,
        workPreference: workPreference.trim(),
        skills,
      });
      setEditing(false);
      setMessage("Đã cập nhật hồ sơ.");
      await loadProfile();
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    router.replace("/");
  }

  function addSkill() {
    const value = newSkill.trim();
    if (!value) return;
    if (!skills.includes(value)) {
      setSkillsText([...skills, value].join(", "));
    }
    setNewSkill("");
  }

  if (loading) {
    return (
      <p className="px-4 py-16 text-center text-sm text-[#68758B]">
        Đang tải hồ sơ cá nhân...
      </p>
    );
  }

  if (!profile) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error || "Không tải được hồ sơ."}</p>
      </div>
    );
  }

  const exp = toNumber(profile.experienceYears);
  const skillLevels = profile.skillLevels ?? [];

  return (
    <div className="bg-[#F8F9FF]">
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}

        <form
          onSubmit={handleSave}
          className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
        >
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start gap-4">
                <div className="relative">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#DCE9FF] text-xl font-bold text-[#003C90]">
                    {initials}
                  </span>
                  <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#006A61] text-white">
                    <BadgeCheck size={12} />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="h-11 rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] px-3 text-sm font-semibold"
                        placeholder="Họ và tên"
                      />
                      <input
                        value={headline}
                        onChange={(event) => setHeadline(event.target.value)}
                        className="h-11 rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] px-3 text-sm"
                        placeholder="Chức danh"
                      />
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-[#0B1C30]">
                        {profile.user.fullName}
                      </h1>
                      <p className="mt-1 text-sm font-semibold text-[#0F52BA]">
                        {profile.headline || "Ứng viên"}
                      </p>
                    </>
                  )}
                  <p className="mt-2 inline-flex flex-wrap items-center gap-2 text-xs text-[#68758B]">
                    <span className="inline-flex items-center gap-1">
                      <Mail size={13} /> {profile.user.email}
                    </span>
                    <span className="rounded-full bg-[#CFFAF3] px-2 py-0.5 text-[10px] font-semibold text-[#006A61]">
                      Đã xác thực
                    </span>
                    <span>{relativeUpdated(profile.updatedAt)}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void navigator.clipboard?.writeText(window.location.href)
                    }
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E8ECF4] bg-white px-3 text-xs font-semibold text-[#68758B]"
                  >
                    <Share2 size={14} /> Chia sẻ
                  </button>
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false);
                          void loadProfile();
                        }}
                        className="inline-flex h-10 items-center rounded-xl px-3 text-xs font-semibold text-[#68758B]"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex h-10 items-center rounded-xl bg-[#003C90] px-4 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {saving ? "Đang lưu..." : "Lưu hồ sơ"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#003C90] px-4 text-xs font-semibold text-white"
                    >
                      <Pencil size={14} /> Chỉnh sửa thông tin hồ sơ
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#F8F9FF] px-4 py-3">
                  <p className="text-[11px] font-semibold text-[#68758B]">
                    Kinh nghiệm
                  </p>
                  {editing ? (
                    <input
                      value={experienceYears}
                      onChange={(event) =>
                        setExperienceYears(event.target.value)
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-[#E8ECF4] bg-white px-2 text-sm font-bold"
                      placeholder="4.5"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-bold text-[#0B1C30]">
                      {exp != null ? `${exp} Năm` : "—"}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-[#F8F9FF] px-4 py-3">
                  <p className="text-[11px] font-semibold text-[#68758B]">
                    Cấp bậc
                  </p>
                  {editing ? (
                    <input
                      value={level}
                      onChange={(event) => setLevel(event.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-[#E8ECF4] bg-white px-2 text-sm font-bold"
                      placeholder="Senior / Lead"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-bold text-[#0B1C30]">
                      {profile.level || "—"}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-[#F8F9FF] px-4 py-3">
                  <p className="text-[11px] font-semibold text-[#68758B]">
                    Mức lương kỳ vọng
                  </p>
                  {editing ? (
                    <div className="mt-1 flex gap-2">
                      <input
                        value={salaryMin}
                        onChange={(event) => setSalaryMin(event.target.value)}
                        className="h-9 w-full rounded-lg border border-[#E8ECF4] bg-white px-2 text-xs"
                        placeholder="Min"
                      />
                      <input
                        value={salaryMax}
                        onChange={(event) => setSalaryMax(event.target.value)}
                        className="h-9 w-full rounded-lg border border-[#E8ECF4] bg-white px-2 text-xs"
                        placeholder="Max"
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-bold text-[#006A61]">
                      {formatSalaryRange(
                        profile.expectedSalaryMin,
                        profile.expectedSalaryMax,
                      ).replace(" đ/tháng", "")}{" "}
                      VNĐ
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-[#0B1C30]">
                  Thông tin cá nhân &amp; Liên hệ
                </h2>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-xs font-semibold text-[#0F52BA]"
                  >
                    Sửa
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] p-4">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#68758B]">
                    <Phone size={13} /> Số điện thoại
                  </p>
                  {editing ? (
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border border-[#E8ECF4] bg-white px-3 text-sm"
                    />
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-[#0B1C30]">
                      {profile.phone || "Chưa cập nhật"}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-[#8793a6]">
                    Khả dụng cho tin nhắn Zalo/Telegram
                  </p>
                </div>
                <div className="rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] p-4">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#68758B]">
                    <MapPin size={13} /> Địa điểm
                  </p>
                  {editing ? (
                    <>
                      <input
                        value={location}
                        onChange={(event) => setLocation(event.target.value)}
                        className="mt-2 h-10 w-full rounded-lg border border-[#E8ECF4] bg-white px-3 text-sm"
                      />
                      <input
                        value={workPreference}
                        onChange={(event) =>
                          setWorkPreference(event.target.value)
                        }
                        className="mt-2 h-10 w-full rounded-lg border border-[#E8ECF4] bg-white px-3 text-sm"
                        placeholder="Mong muốn làm việc"
                      />
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-sm font-semibold text-[#0B1C30]">
                        {profile.location || "Chưa cập nhật"}
                      </p>
                      <p className="mt-1 text-[11px] text-[#8793a6]">
                        {profile.workPreference ||
                          "Chưa nêu mong muốn làm việc"}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#68758B]">
                  Giới thiệu bản thân &amp; Mục tiêu nghề nghiệp
                </p>
                {editing ? (
                  <textarea
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    rows={5}
                    className="mt-2 w-full rounded-xl border border-[#E8ECF4] bg-[#F8F9FF] px-3 py-3 text-sm leading-6"
                  />
                ) : (
                  <p className="mt-2 text-sm leading-7 text-[#44506A]">
                    {profile.bio || "Chưa có giới thiệu."}
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#E8ECF4] bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-[#0B1C30]">
                  Kỹ năng chính (Skills Tags)
                </h2>
                {editing && (
                  <div className="flex gap-2">
                    <input
                      value={newSkill}
                      onChange={(event) => setNewSkill(event.target.value)}
                      placeholder="Thêm kỹ năng"
                      className="h-9 rounded-lg border border-[#E8ECF4] px-3 text-xs"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#EFF4FF] px-3 text-xs font-semibold text-[#0F52BA]"
                    >
                      <Plus size={14} /> Thêm
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {skills.length === 0 ? (
                  <p className="text-xs text-[#68758B]">Chưa có kỹ năng.</p>
                ) : (
                  skills.map((skill, index) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-full bg-[#F0F3F9] px-3 py-1.5 text-xs font-semibold text-[#34445E]"
                    >
                      {index < 2 && (
                        <Star
                          size={12}
                          className="fill-[#0F52BA] text-[#0F52BA]"
                        />
                      )}
                      {skill}
                    </span>
                  ))
                )}
              </div>

              {skillLevels.length > 0 && (
                <div className="mt-5 space-y-3">
                  {skillLevels.map((item) => (
                    <div key={item.name}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-[#44506A]">
                          {item.name}
                        </span>
                        <span className="font-semibold text-[#003C90]">
                          {item.percent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#E8ECF4]">
                        <div
                          className="h-full rounded-full bg-[#0F52BA]"
                          style={{ width: `${Math.min(100, item.percent)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-[#E8ECF4] bg-white p-4">
              <h2 className="px-1 text-sm font-bold text-[#0B1C30]">
                Quản lý &amp; Tiện ích
              </h2>
              <nav className="mt-2 space-y-1">
                <Link
                  href="/candidate/applications"
                  className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-[#0B1C30] hover:bg-[#F8F9FF]"
                >
                  <span className="inline-flex items-center gap-2">
                    <FileText size={16} className="text-[#0F52BA]" />
                    Đơn ứng tuyển của tôi
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[11px] font-bold text-[#003C90]">
                      {profile.applicationsCount ?? 0}
                    </span>
                    <ChevronRight size={16} className="text-[#C3C6D5]" />
                  </span>
                </Link>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm text-[#0B1C30] hover:bg-[#F8F9FF]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Lock size={16} className="text-[#0F52BA]" />
                    Mật khẩu
                  </span>
                  <ChevronRight size={16} className="text-[#C3C6D5]" />
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm text-[#0B1C30] hover:bg-[#F8F9FF]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Bell size={16} className="text-[#0F52BA]" />
                    Thông báo việc làm
                  </span>
                  <ChevronRight size={16} className="text-[#C3C6D5]" />
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm text-[#0B1C30] hover:bg-[#F8F9FF]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Shield size={16} className="text-[#0F52BA]" />
                    Hỗ trợ &amp; Điều khoản
                  </span>
                  <ChevronRight size={16} className="text-[#C3C6D5]" />
                </button>
              </nav>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-semibold text-red-600 hover:bg-red-100"
              >
                <LogOut size={16} /> Đăng xuất tài khoản
              </button>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[#003C90] to-[#0F52BA] p-5 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-100">
                Độ sẵn sàng ứng tuyển
              </p>
              <h3 className="mt-2 text-base font-bold">
                Hồ sơ nổi bật tuần này
              </h3>
              <p className="mt-2 text-xs leading-5 text-blue-100">
                Hồ sơ của bạn đang nhận lời mời từ các công ty Fintech &amp; SaaS.
              </p>
              <Link
                href="/candidate"
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-white px-4 text-xs font-semibold text-[#003C90]"
              >
                Xem việc làm đề xuất →
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E8ECF4] bg-white p-4 text-[11px] leading-5 text-[#68758B]">
              <p className="inline-flex items-center gap-1.5 font-semibold text-[#0B1C30]">
                <Wallet size={13} className="text-[#0F52BA]" />
                Quyền riêng tư dữ liệu
              </p>
              <p className="mt-1">
                Thông tin hồ sơ chỉ được chia sẻ khi bạn nộp đơn. Không bán dữ
                liệu cho bên thứ ba.
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5">
                <Briefcase size={13} />
                Hồ sơ candidate trên Tuyển dụng nhanh
              </p>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}
