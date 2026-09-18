import type { Metadata } from "next";
import "./globals.css";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: {
    default: "AI 推甄審查模擬器｜交出備審之前，先被審一次",
    template: "%s｜AI 推甄審查模擬器",
  },
  description:
    "上傳自傳、成績單與研究計畫，依 116 學年度各校資工所簡章與歷年推甄經驗，估算審查權重、錄取機率區間，並逐項給出改善建議。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // 瀏覽器擴充功能（如螢幕錄製類）會在 React hydrate 之前，替 <html> 加上 data-* 屬性，
    // 造成與伺服器輸出不一致的 hydration 警告。suppressHydrationWarning 只作用於這個元素本身
    // 的屬性差異（不含子元素），不會遮蔽頁面內容真正的 hydration 錯誤。
    <html lang="zh-Hant" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* 中文網頁字型：Google Fonts 會依實際用字切片載入，離線時退回系統字型 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* 此規則是針對 Pages Router 的；App Router 的根 layout 會套用到所有頁面，在此載入字型是正確做法 */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@600;700;900&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
