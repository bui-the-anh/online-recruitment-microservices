import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Tuyển dụng nhanh | Kết nối Nhân tài Công nghệ",
  description:
    "Hệ sinh thái tuyển dụng kỹ thuật số 4.0 — kết nối nhân tài công nghệ và doanh nghiệp hàng đầu Việt Nam.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
