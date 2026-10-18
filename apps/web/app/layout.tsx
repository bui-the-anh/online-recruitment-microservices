import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Online Recruitment",
  description: "Frontend scaffold for the online recruitment platform.",
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
