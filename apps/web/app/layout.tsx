import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Notifications, { OnlineCount } from "@/components/notifications";
import { getApiUrl } from "../lib/config";
import { getSiteSettings, siteName } from "../lib/blog-data";
import Link from "next/link";
import { Suspense } from "react";
import Navigation from "@/components/navigation";
import SiteFooter from "@/components/site-footer";
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

// 服务端默认输出 data-theme="dark"（熄灯）；保存过“开灯”或“跟随系统”时在绘制前改掉。
const themeScript = `try{var t=localStorage.getItem("theme"),d=document.documentElement;if(t==="light")d.dataset.theme="light";else if(t==="system")delete d.dataset.theme}catch(e){}`;

// 子页面的标题会套用模板，例如“文章 - Sin’s Space”。站名、描述取后台 SEO 设置；
// metadataBase 取后台“网站地址”，让分享链接、RSS 自动发现等相对地址变成完整网址；读取失败时省略。
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings().catch(() => null);
  const name = settings?.name ?? siteName;
  const description = settings?.description;
  return {
    metadataBase: settings ? new URL(settings.siteUrl) : undefined,
    title: { default: name, template: `%s - ${name}` },
    description,
    openGraph: { siteName: name, title: name, description, type: "website", locale: "zh_CN" },
    alternates: { types: { "application/rss+xml": [{ url: "/feed.xml", title: name }] } },
  };
}

async function SiteName() {
  return (await getSiteSettings().catch(() => null))?.name ?? siteName;
}

export default function RootLayout({ children, details }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      data-theme="dark"
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
          <div className="site-shell">
            <header className="site-header">
              <div className="site-header-inner">
                <Link className="site-brand" href="/">
                  <Suspense fallback={siteName}><SiteName /></Suspense>
                </Link>
                <Navigation />
                <div className="site-header-tools">
                  <OnlineCount />
                  <ThemeSwitcher />
                </div>
              </div>
            </header>
            <ViewTransition default="page-switch">
              <main className="site-content" id="main-content" tabIndex={-1}>
                {children}
              </main>
            </ViewTransition>
            {/* 补充信息来自平行路由 app/@details（目录、搜索与标签），宽屏悬浮在正文右侧 */}
            <aside className="site-details" aria-label="补充信息">
              {details}
            </aside>
            <SiteFooter />
          </div>
        </Notifications>
      </body>
    </html>
  );
}
