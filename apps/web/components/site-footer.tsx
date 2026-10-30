import { Heart, Moon } from "lucide-react";
import Link from "./locale-provider";
import { Suspense } from "react";
import { getSiteDescription, siteDescription } from "../lib/blog-data";
import { getLocale, getT } from "../lib/i18n/server";
import FooterSky from "./footer-sky";
import { OnlineCount } from "./notifications";
import "./site-footer.css";

// 站点那句话：外文页面用配置片段里的译文，没写译文时是中文原文并标明语言
async function Motto() {
  const { text, original } = await getSiteDescription(await getLocale());
  return original ? <span lang="zh-CN">{text}</span> : text;
}

// 页脚：最上面一条星带（每天刷题和写代码的记录，读取失败时不显示），下面左边是一弯小月亮加后台那句话、细字的英文落款，
// 右边是几个小链接和在线人数。
export default async function SiteFooter() {
  const t = (await getT()).footer;
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Suspense fallback={null}><FooterSky /></Suspense>
        <div className="site-footer-about">
          <p className="site-footer-motto">
            <Moon size={16} strokeWidth={1.5} aria-hidden="true" />
            <Suspense fallback={siteDescription}><Motto /></Suspense>
          </p>
          <p className="site-footer-sign">
            © 2026 Sin · Made with <Heart size={12} aria-label="love" /> under the stars
          </p>
        </div>
        <div className="site-footer-side">
          <nav className="site-footer-links" aria-label={t.links}>
            <Link href="/timeline">{t.timeline}</Link>
            <Link href="/friends">{t.friends}</Link>
            <a href="/feed.xml">RSS</a>
          </nav>
          <OnlineCount />
        </div>
      </div>
    </footer>
  );
}
