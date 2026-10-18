"use client";

import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-2">
        <Link href="/admin" className="text-xs font-semibold text-[#0F52BA]">
          ← Tổng quan
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-[#0B1C30]">Cài đặt hệ thống</h1>
      <p className="mt-1 text-sm text-[#68758B]">
        Khu vực cấu hình vận hành sẽ được mở rộng ở bước tiếp theo.
      </p>
      <div className="mt-6 rounded-2xl border border-dashed border-[#E4EAF3] bg-white px-5 py-10 text-sm text-[#68758B]">
        Hiện tại dùng biến môi trường JWT, Kafka và DATABASE_URL để điều khiển
        hệ thống. UI cấu hình chi tiết chưa mở.
      </div>
    </main>
  );
}
