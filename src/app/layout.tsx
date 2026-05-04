import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Food Roulette",
  description: "用 AI 整理餐廳資料，讓輪盤幫你決定今天吃什麼。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full bg-[#f7f4ef] text-stone-950">{children}</body>
    </html>
  );
}
