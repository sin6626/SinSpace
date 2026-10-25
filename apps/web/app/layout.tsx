import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Notifications, { OnlineCount } from "@/components/notifications";
import { getApiUrl } from "../lib/config";
import { getSiteUrl } from "../lib/blog-data";
import { siteDescription, siteName } from "../lib/page-metadata";
import Navigation from "@/components/navigation";
import ResizableLayout from "@/components/resizable-layout";
import ThemeSwitcher from "@/components/theme-switcher";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

// 子页面的标题会套用模板，例如“文章 - Sin Personal Space”。
// metadataBase 取后台“网站地址”，让分享链接、RSS 自动发现等相对地址变成完整网址；读取失败时省略。
export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = await getSiteUrl().then((site) => new URL(site), () => undefined);
  return {
    metadataBase,
    title: { default: siteName, template: `%s - ${siteName}` },
    description: siteDescription,
    openGraph: { siteName, title: siteName, description: siteDescription, type: "website", locale: "zh_CN" },
    alternates: { types: { "application/rss+xml": [{ url: "/feed.xml", title: siteName }] } },
  };
}

export default function RootLayout({ children, details }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // 下面的脚本会在水合前设置 data-theme，属性与服务端不同是预期的。
      suppressHydrationWarning
    >
      <head>
        {/* 绘制前读取已保存的主题，避免刷新时先闪一下系统主题。 */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Notifications url={`${new URL(getApiUrl()).origin}/web`}>
          <a className="skip-link" href="#main-content">
            跳到主要内容
          </a>
          <ResizableLayout>
            <header className="site-navigation">
              <div className="site-brand">
                <span className="site-brand-name">Sin</span>
                <span className="site-brand-description">Personal Space</span>
              </div>
              <Navigation />
              <ThemeSwitcher />
              <OnlineCount />
            </header>
            <ViewTransition default="page-switch">
              <main className="site-content" id="main-content" tabIndex={-1}>
                {children}
              </main>
            </ViewTransition>
            {/* 右栏内容来自平行路由 app/@details，随页面变化 */}
            <aside className="site-details" aria-label="补充信息">
              {details}
            </aside>
          </ResizableLayout>
        </Notifications>
      </body>
    </html>
  );
}
