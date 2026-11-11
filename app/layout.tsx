import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "稿件工作台",
  description: "AI content workflow MVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
