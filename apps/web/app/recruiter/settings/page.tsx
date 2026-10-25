"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  KeyRound,
  Laptop,
  MonitorSmartphone,
  RotateCcw,
  Save,
  Smartphone,
  Trash2,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";

type Settings = {
  notifyNewApplication: boolean;
  notifyJobModeration: boolean;
  notifyInterviewReminder: boolean;
  notifyWeeklyReport: boolean;
  updatedAt?: string;
};

type SessionItem = {
  id: string;
  current: boolean;
  deviceLabel: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
};

const DEFAULT_SETTINGS: Settings = {
  notifyNewApplication: true,
  notifyJobModeration: true,
  notifyInterviewReminder: true,
  notifyWeeklyReport: false,
};

const inputClass =
  "h-11 w-full rounded-xl border border-[#E4EAF3] bg-[#F8FAFD] px-3 text-sm text-[#0B1C30] outline-none transition focus:border-[#0F52BA]/40 focus:bg-white focus:ring-2 focus:ring-[#0F52BA]/15";

function passwordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return { score, label: "Yếu", color: "bg-red-500" };
  if (score === 3) return { score, label: "Trung bình", color: "bg-amber-500" };
  if (score === 4) return { score, label: "Tốt", color: "bg-emerald-500" };
  return { score, label: "Rất tốt", color: "bg-emerald-600" };
}

function browserFromUa(ua?: string | null) {
  const value = ua || "";
  if (/Edg\//i.test(value)) return "Microsoft Edge";
  if (/Chrome\//i.test(value)) return "Chrome";
  if (/Safari\//i.test(value) && !/Chrome\//i.test(value)) return "Safari";
  if (/Firefox\//i.test(value)) return "Firefox";
  return "Trình duyệt";
}

function DeviceIcon({ label }: { label: string }) {
  if (/iphone|android|mobile/i.test(label)) {
    return <Smartphone size={16} className="text-[#003C90]" />;
  }
  return <Laptop size={16} className="text-[#003C90]" />;
}

function ToggleRow({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#E8ECF4] bg-[#FBFCFE] px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#0B1C30]">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-[#68758B]">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#003C90]" : "bg-[#D7E0EE]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export default function RecruiterSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const strength = useMemo(() => passwordStrength(newPassword), [newPassword]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsRes, sessionsRes] = await Promise.all([
        api.get<Settings>("/settings"),
        api.get<{ items: SessionItem[] }>("/auth/sessions"),
      ]);
      setSettings({
        notifyNewApplication: Boolean(settingsRes.data.notifyNewApplication),
        notifyJobModeration: Boolean(settingsRes.data.notifyJobModeration),
        notifyInterviewReminder: Boolean(
          settingsRes.data.notifyInterviewReminder,
        ),
        notifyWeeklyReport: Boolean(settingsRes.data.notifyWeeklyReport),
        updatedAt: settingsRes.data.updatedAt,
      });
      setSessions(sessionsRes.data.items || []);
      if (settingsRes.data.updatedAt) {
        setSavedAt(settingsRes.data.updatedAt);
      }
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.patch<Settings>("/settings", settings);
      setSettings({
        notifyNewApplication: data.notifyNewApplication,
        notifyJobModeration: data.notifyJobModeration,
        notifyInterviewReminder: data.notifyInterviewReminder,
        notifyWeeklyReport: data.notifyWeeklyReport,
        updatedAt: data.updatedAt,
      });
      setSavedAt(data.updatedAt || new Date().toISOString());
      setMessage("Đã lưu cài đặt thông báo.");
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function restoreDefaults() {
    setSettings(DEFAULT_SETTINGS);
    setMessage("Đã khôi phục mặc định — nhấn Lưu cài đặt để áp dụng.");
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setPasswordBusy(true);
    setError("");
    setMessage("");
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Đã cập nhật mật khẩu thành công.");
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function revokeSession(id: string) {
    try {
      await api.post(`/auth/sessions/${id}/revoke`);
      await load();
      setMessage("Đã đăng xuất thiết bị.");
    } catch (requestError) {
      setError(formatApiError(requestError));
    }
  }

  async function revokeOthers() {
    try {
      await api.post("/auth/sessions/revoke-others");
      await load();
      setMessage("Đã đăng xuất tất cả thiết bị khác.");
    } catch (requestError) {
      setError(formatApiError(requestError));
    }
  }

  if (loading) {
    return (
      <main className="px-4 py-10 text-sm text-[#68758B] sm:px-6 lg:px-8">
        Đang tải cài đặt hệ thống...
      </main>
    );
  }

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0B1C30]">Cài đặt hệ thống</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#68758B]">
          Cấu hình bảo mật, phương thức nhận thông báo và quản lý phiên truy cập
          an toàn.
        </p>
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

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        {/* 1. Password */}
        <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#003C90]">
              <KeyRound size={16} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8793a6]">
                1 · Bảo mật
              </p>
              <h2 className="text-base font-bold text-[#0B1C30]">
                Bảo mật & Mật khẩu
              </h2>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[#0B1C30]">
                Mật khẩu hiện tại
              </span>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[#0B1C30]">
                Mật khẩu mới
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
              />
              {newPassword ? (
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-[#68758B]">Độ mạnh</span>
                    <span className="font-semibold text-[#0B1C30]">
                      {strength.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 flex-1 rounded-full ${
                          index < strength.score
                            ? strength.color
                            : "bg-[#E8ECF4]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <p className="mt-2 text-[11px] leading-5 text-[#8793a6]">
                Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ít nhất một ký
                tự đặc biệt.
              </p>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[#0B1C30]">
                Xác nhận mật khẩu mới
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
              />
            </label>

            <button
              type="submit"
              disabled={passwordBusy}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#003C90] text-sm font-semibold text-white transition hover:bg-[#0F52BA] disabled:opacity-60"
            >
              <KeyRound size={16} />
              {passwordBusy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>
          </form>
        </section>

        <div className="space-y-5">
          {/* 2. Notifications */}
          <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#003C90]">
                <Bell size={16} />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8793a6]">
                  2 · Thông báo
                </p>
                <h2 className="text-base font-bold text-[#0B1C30]">
                  Tùy chọn thông báo
                </h2>
              </div>
            </div>

            <div className="space-y-2.5">
              <ToggleRow
                checked={settings.notifyNewApplication}
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifyNewApplication: value,
                  }))
                }
                title="Ứng viên nộp hồ sơ mới (tức thì)"
                hint="Email / push khi có ứng viên ứng tuyển vào tin của bạn."
              />
              <ToggleRow
                checked={settings.notifyJobModeration}
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifyJobModeration: value,
                  }))
                }
                title="Admin phê duyệt / từ chối tin"
                hint="Cập nhật khi tin tuyển dụng được duyệt hoặc bị từ chối."
              />
              <ToggleRow
                checked={settings.notifyInterviewReminder}
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifyInterviewReminder: value,
                  }))
                }
                title="Nhắc lịch phỏng vấn (trước 30/60 phút)"
                hint="Nhắc tự động qua Email/Push trước giờ phỏng vấn."
              />
              <ToggleRow
                checked={settings.notifyWeeklyReport}
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifyWeeklyReport: value,
                  }))
                }
                title="Báo cáo tuyển dụng định kỳ"
                hint="Tóm tắt hiệu quả tin & lượng ứng viên gửi mỗi sáng Thứ Hai."
              />
            </div>
          </section>

          {/* 3. Sessions */}
          <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#003C90]">
                  <MonitorSmartphone size={16} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8793a6]">
                    3 · Phiên truy cập
                  </p>
                  <h2 className="text-base font-bold text-[#0B1C30]">
                    Phiên đăng nhập & Thiết bị
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void revokeOthers()}
                className="rounded-lg border border-[#FECACA] bg-[#FFF5F5] px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-[#FEE2E2]"
              >
                Đăng xuất tất cả thiết bị khác
              </button>
            </div>

            <div className="space-y-2.5">
              {sessions.length === 0 ? (
                <p className="text-sm text-[#8793a6]">
                  Không có phiên đang hoạt động.
                </p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[#E8ECF4] px-3.5 py-3"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F6FB]">
                        <DeviceIcon label={session.deviceLabel} />
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#0B1C30]">
                          {session.deviceLabel}
                          {session.current ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <Check size={10} /> Phiên hiện tại
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#8793a6]">
                          {browserFromUa(session.userAgent)} · IP{" "}
                          {session.ipAddress || "—"}
                        </p>
                        <p className="text-[11px] text-[#C3C6D5]">
                          {session.current
                            ? "Đang hoạt động"
                            : `Hoạt động ${new Date(session.createdAt).toLocaleString("vi-VN")}`}
                        </p>
                      </div>
                    </div>
                    {!session.current ? (
                      <button
                        type="button"
                        onClick={() => void revokeSession(session.id)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#FECACA] px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-[#FFF5F5]"
                      >
                        <Trash2 size={12} /> Đăng xuất
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E4EAF3] pt-4">
        <p className="text-xs text-[#8793a6]">
          {savedAt
            ? `Đã lưu lúc ${new Date(savedAt).toLocaleString("vi-VN")}`
            : "Chưa lưu thay đổi thông báo."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void restoreDefaults()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#D7E0EE] bg-white px-4 text-sm font-semibold text-[#44506A] hover:bg-[#F8FAFD]"
          >
            <RotateCcw size={15} />
            Khôi phục mặc định
          </button>
          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#003C90] px-4 text-sm font-semibold text-white hover:bg-[#0F52BA] disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Đang lưu..." : "Lưu cài đặt"}
          </button>
        </div>
      </div>
    </main>
  );
}
