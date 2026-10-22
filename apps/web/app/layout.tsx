import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navigation from "./navigation";
import ResizableLayout from "./resizable-layout";
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
          <main className="site-content" id="main-content" tabIndex={-1}>
            {children}
          </main>
          <aside className="site-details" aria-labelledby="details-heading">
            <h2 id="details-heading">补充信息</h2>
            <p>这里将展示与当前内容相关的信息。</p>
          </aside>
        </ResizableLayout>
      </body>
    </html>
  );
}
