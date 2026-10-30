import { Heart, Moon } from "lucide-react";
import Link from "./locale-provider";
import { Suspense } from "react";
import { getSiteSettings, siteDescription } from "../lib/blog-data";
import { OnlineCount } from "./notifications";

async function Motto() {
  return (await getSiteSettings().catch(() => null))?.description ?? siteDescription;
}

// 页脚：居中三行，不放站名。一弯小月亮加后台那句话；几个小链接；一行细字的英文落款和在线人数。
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-motto">
          <Moon size={16} strokeWidth={1.5} aria-hidden="true" />
          <Suspense fallback={siteDescription}><Motto /></Suspense>
        </p>
        <nav className="site-footer-links" aria-label="页脚链接">
          <Link href="/timeline">时间线</Link>
          <Link href="/friends">友链</Link>
          <a href="/feed.xml">RSS</a>
        </nav>
        <div className="site-footer-meta">
          <p className="site-footer-sign">
            © 2026 Sin · Made with <Heart size={12} aria-label="love" /> under the stars
          </p>
          <OnlineCount />
        </div>
      </div>
    </footer>
  );
}
