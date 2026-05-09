import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppNav } from "./app-nav";
import { PwaRegister } from "./pwa-register";

export const metadata: Metadata = {
  title: "Food Roulette",
  description: "用 AI 整理餐廳資料，讓輪盤幫你決定今天吃什麼。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FoodPick",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f4ef",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full bg-[#f7f4ef] text-stone-950">
        <AppNav />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
