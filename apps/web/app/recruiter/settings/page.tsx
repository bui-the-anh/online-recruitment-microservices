"use client";

import Link from "next/link";

export default function RecruiterSettingsPage() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[#0B1C30]">Cài đặt hệ thống</h1>
      <p className="mt-1 text-sm text-[#68758B]">
        Cấu hình thông báo và bảo mật tài khoản sẽ mở ở bước sau.
      </p>
      <div className="mt-6 rounded-2xl border border-dashed border-[#E4EAF3] bg-white px-5 py-10 text-sm text-[#68758B]">
        Quay lại{" "}
        <Link href="/recruiter" className="font-semibold text-[#0F52BA]">
          bảng điều khiển
        </Link>
        .
      </div>
    </main>
  );
}
