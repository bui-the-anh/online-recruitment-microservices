"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";

type AuditLog = {
  id: string;
  action: string;
  createdAt: string;
  actor?: { fullName: string; email: string; role: string } | null;
  target?: { fullName: string; email: string; role: string } | null;
};

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await api.get<AuditLog[]>("/admin/audit-logs");
        if (!cancelled) setItems(response.data);
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

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-2">
        <Link href="/admin" className="text-xs font-semibold text-[#0F52BA]">
          ← Tổng quan
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-[#0B1C30]">Lịch sử kiểm toán</h1>
      <p className="mt-1 text-sm text-[#68758B]">
        Nhật ký thao tác quản trị gần đây trên hệ thống.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-[#68758B]">Đang tải...</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#E4EAF3] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8F9FF] text-xs uppercase tracking-wide text-[#8793a6]">
              <tr>
                <th className="px-4 py-3 font-semibold">Thời gian</th>
                <th className="px-4 py-3 font-semibold">Hành động</th>
                <th className="px-4 py-3 font-semibold">Người thực hiện</th>
                <th className="px-4 py-3 font-semibold">Đối tượng</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-[#E4EAF3]">
                  <td className="px-4 py-3 text-xs text-[#68758B]">
                    {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#0B1C30]">
                    {item.action}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#44506A]">
                    {item.actor
                      ? `${item.actor.fullName} (${item.actor.role})`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#44506A]">
                    {item.target
                      ? `${item.target.fullName} (${item.target.role})`
                      : "—"}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-[#8793a6]"
                  >
                    Chưa có nhật ký kiểm toán.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
