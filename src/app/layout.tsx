import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "薬剤師キャリアすごろく",
  description: "薬学生向け採用コンテンツ：選考会から入社3年目までのキャリアを体験するすごろくゲーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ background: "var(--c-bg)" }}
    >
      <body className="min-h-full flex flex-col" style={{ background: "var(--c-bg)" }}>
        {children}
      </body>
    </html>
  );
}
