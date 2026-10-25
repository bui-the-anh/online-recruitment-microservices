"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Bell,
  KeyRound,
  MonitorSmartphone,
  Save,
  Shield,
  Trash2,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";

type Settings = {
  notifyJobPending: boolean;
  notifyRecruiterRegistered: boolean;
  notifyBrowserSound: boolean;
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

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-[#E8ECF4] px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-[#0B1C30]">{label}</p>
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

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    notifyJobPending: true,
    notifyRecruiterRegistered: true,
    notifyBrowserSound: false,
  });
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsRes, sessionsRes] = await Promise.all([
        api.get<Settings>("/settings"),
        api.get<{ items: SessionItem[] }>("/auth/sessions"),
      ]);
      setSettings(settingsRes.data);
      setSessions(sessionsRes.data.items || []);
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
      setSettings(data);
      setMessage("Đã lưu cấu hình thông báo.");
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setSaving(false);
    }
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
    setError("");
    try {
      await api.post(`/auth/sessions/${id}/revoke`);
      await load();
      setMessage("Đã đăng xuất thiết bị.");
    } catch (requestError) {
      setError(formatApiError(requestError));
    }
  }

  async function revokeOthers() {
    setError("");
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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0B1C30]">Cài đặt hệ thống</h1>
            <span className="rounded-full bg-[#EFF4FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#003C90]">
              ADMIN PORTAL GOVERNANCE
            </span>
          </div>
          <p className="mt-1 text-sm text-[#68758B]">
            Quản lý thông báo, cập nhật mật khẩu bảo mật và kiểm soát phiên đăng nhập admin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={saving}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#003C90] px-4 text-sm font-semibold text-white hover:bg-[#0F52BA] disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? "Đang lưu..." : "Lưu và áp dụng"}
        </button>
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

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell size={16} className="text-[#003C90]" />
            <h2 className="text-base font-bold text-[#0B1C30]">
              Thông báo vận hành
            </h2>
          </div>
          <div className="space-y-3">
            <Toggle
              checked={settings.notifyJobPending}
              onChange={(value) =>
                setSettings((prev) => ({ ...prev, notifyJobPending: value }))
              }
              label="Tin tuyển dụng chờ duyệt"
              hint="Nhận thông báo khi có tin mới cần phê duyệt."
            />
            <Toggle
              checked={settings.notifyRecruiterRegistered}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  notifyRecruiterRegistered: value,
                }))
              }
              label="Doanh nghiệp đăng ký mới"
              hint="Gửi thông báo khi có recruiter đăng ký tài khoản."
            />
            <Toggle
              checked={settings.notifyBrowserSound}
              onChange={(value) =>
                setSettings((prev) => ({ ...prev, notifyBrowserSound: value }))
              }
              label="Âm thanh & chuông trình duyệt"
              hint="Phát âm báo khi có tương tác trực tiếp trên workspace."
            />
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Shield size={16} className="text-[#003C90]" />
              <h2 className="text-base font-bold text-[#0B1C30]">
                Bảo mật & mật khẩu admin
              </h2>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3">
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
                  placeholder="Tối thiểu 8 ký tự"
                />
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
                />
              </label>
              <button
                type="submit"
                disabled={passwordBusy}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#003C90] text-sm font-semibold text-white hover:bg-[#0F52BA] disabled:opacity-60"
              >
                <KeyRound size={16} />
                {passwordBusy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-[#E4EAF3] bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MonitorSmartphone size={16} className="text-[#003C90]" />
                <h2 className="text-base font-bold text-[#0B1C30]">
                  Phiên đăng nhập & thiết bị
                </h2>
              </div>
              <button
                type="button"
                onClick={() => void revokeOthers()}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Đăng xuất tất cả thiết bị khác
              </button>
            </div>
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <p className="text-sm text-[#8793a6]">Không có phiên đang hoạt động.</p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[#E8ECF4] px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#0B1C30]">
                        {session.deviceLabel}
                        {session.current ? (
                          <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Hiện tại
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8793a6]">
                        IP: {session.ipAddress || "—"} ·{" "}
                        {new Date(session.createdAt).toLocaleString("vi-VN")}
                      </p>
                      {session.userAgent ? (
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-[#C3C6D5]">
                          {session.userAgent}
                        </p>
                      ) : null}
                    </div>
                    {!session.current ? (
                      <button
                        type="button"
                        onClick={() => void revokeSession(session.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#FECACA] px-2.5 py-1.5 text-xs font-semibold text-red-600"
                      >
                        <Trash2 size={12} /> Logout
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-[#E4EAF3] bg-[#F8FAFD] px-3 text-sm text-[#0B1C30] outline-none transition focus:border-[#0F52BA]/40 focus:bg-white focus:ring-2 focus:ring-[#0F52BA]/15";
