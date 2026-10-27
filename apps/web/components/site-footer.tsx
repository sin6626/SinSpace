import Link from "next/link";
import { Suspense } from "react";
import { getSiteSettings, siteDescription, siteName } from "../lib/blog-data";
import { OnlineCount } from "./notifications";
import "./details-sidebar.css";

// 站名是缓存数据，放进 Suspense，不挡住页面的静态外壳。邮件订阅在首页首屏底部的“订阅”按钮里。
async function About() {
  const settings = await getSiteSettings().catch(() => null);
  return <AboutText name={settings?.name ?? siteName} description={settings?.description ?? siteDescription} />;
}

function AboutText({ name, description }: { name: string; description: string }) {
  return (
    <div className="site-footer-about">
      <p className="site-footer-name">{name}</p>
      <p>{description}</p>
    </div>
  );
}

// 页脚：站名和那句话，底下一行小链接和在线人数。
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <Suspense fallback={<AboutText name={siteName} description={siteDescription} />}>
            <About />
          </Suspense>
        </div>
        <div className="site-footer-meta">
          <nav aria-label="页脚链接">
            <Link href="/timeline">时间线</Link>
            <Link href="/friends">友链</Link>
            <a href="/feed.xml">RSS</a>
          </nav>
          <OnlineCount />
        </div>
      </div>
    </footer>
  );
}
