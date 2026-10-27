import { Suspense } from "react";
import { getSiteSettings, getSubscribeOptions, siteName } from "../lib/blog-data";
import { getApiUrl } from "../lib/config";
import SubscribeForm from "./subscribe-form";
import "./details-sidebar.css";

// 订阅开关和站名都是缓存数据，各自放进 Suspense，不挡住页面的静态外壳。
async function Subscribe() {
  const subscribe = await getSubscribeOptions().catch(() => null);
  return subscribe?.enabled ? <SubscribeForm apiUrl={getApiUrl()} types={subscribe.types} /> : null;
}

async function SiteName() {
  return (await getSiteSettings().catch(() => null))?.name ?? siteName;
}

// 页脚：邮件订阅（后台开启时显示）、站名与 RSS。
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Suspense fallback={null}>
          <Subscribe />
        </Suspense>
        <p className="site-footer-meta">
          <span><Suspense fallback={siteName}><SiteName /></Suspense></span>
          <a href="/feed.xml">RSS</a>
        </p>
      </div>
    </footer>
  );
}
