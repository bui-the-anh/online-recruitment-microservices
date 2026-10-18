import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "CareerLink | Kết nối nghề nghiệp",
  description: "Kết nối ứng viên và nhà tuyển dụng trên CareerLink.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
