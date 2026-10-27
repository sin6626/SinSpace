import Link from "next/link";
import { Suspense } from "react";
import { getSiteSettings, getSubscribeOptions, siteDescription, siteName } from "../lib/blog-data";
import { getApiUrl } from "../lib/config";
import { OnlineCount } from "./notifications";
import SubscribeForm from "./subscribe-form";
import "./details-sidebar.css";

// 订阅开关和站名都是缓存数据，各自放进 Suspense，不挡住页面的静态外壳。
async function Subscribe() {
  const subscribe = await getSubscribeOptions().catch(() => null);
  return subscribe?.enabled ? <SubscribeForm apiUrl={getApiUrl()} types={subscribe.types} /> : null;
}

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

// 页脚：左边是站名和那句话，右边是邮件订阅（后台开启时），底下一行小链接和在线人数。
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <Suspense fallback={<AboutText name={siteName} description={siteDescription} />}>
            <About />
          </Suspense>
          <Suspense fallback={null}>
            <Subscribe />
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
