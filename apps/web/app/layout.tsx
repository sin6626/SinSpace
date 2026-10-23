import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Notifications from "@/components/notifications";
import { getApiUrl } from "../lib/config";
import Navigation from "@/components/navigation";
import ResizableLayout from "@/components/resizable-layout";
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
  title: "Sin Personal Space",
  description: "技术文章、个人作品与生活记录。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
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
            </header>
            <ViewTransition default="page-switch">
              <main className="site-content" id="main-content" tabIndex={-1}>
                {children}
              </main>
            </ViewTransition>
            <aside className="site-details" aria-labelledby="details-heading">
              <h2 id="details-heading">补充信息</h2>
              <p>这里将展示与当前内容相关的信息。</p>
            </aside>
          </ResizableLayout>
        </Notifications>
      </body>
    </html>
  );
}
