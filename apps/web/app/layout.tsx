import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Geist_Mono, Manrope, Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import Notifications from "@/components/notifications";
import { getApiUrl } from "../lib/config";
import { getSiteSettings, siteName } from "../lib/blog-data";
import Link from "next/link";
import { Suspense } from "react";
import Navigation from "@/components/navigation";
import SiteFooter from "@/components/site-footer";
import ThemeMenu from "@/components/theme-menu";
import "./globals.css";

// 英文和数字用 Manrope：笔画细、字形干净。中文在 Mac 上用系统的苹方；Windows 没有苹方，
// 默认会退到较粗的微软雅黑，所以再给一份思源黑体（Noto Sans SC），按字切片、不预加载，只在缺字时才下载。
const manrope = Manrope({
  variable: "--font-latin",
  subsets: ["latin"],
  display: "swap",
});

const notoSans = Noto_Sans_SC({
  variable: "--font-cjk-sans",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 手记的衬线体：思源宋体（Noto Serif SC），由 Next 自托管、按字切片。只声明字体，不预加载；
// 浏览器只在页面真的用到衬线字（手记、首页手记预览）时才下载对应的切片。
const notoSerif = Noto_Serif_SC({
  variable: "--font-note-serif",
  subsets: ["latin"],
  preload: false,
  display: "swap",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      data-theme="dark"
      className={`${manrope.variable} ${notoSans.variable} ${geistMono.variable} ${notoSerif.variable} h-full antialiased`}
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
                  <ThemeMenu />
                </div>
              </div>
            </header>
            <ViewTransition default="page-switch">
              <main className="site-content" id="main-content" tabIndex={-1}>
                {children}
              </main>
            </ViewTransition>
            <SiteFooter />
          </div>
        </Notifications>
      </body>
    </html>
  );
}
