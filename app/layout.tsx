import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "薬学生 LINE 採用 CRM",
  description: "薬学生の新卒採用業務と LINE 公式アカウント運用を一元化する管理ツール"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
