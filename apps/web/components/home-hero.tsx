import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { getOwner, getSiteSettings, siteDescription } from "../lib/blog-data";
import Starfield from "./starfield";
import "./home-hero.css";

// 首页第一屏：WebGL 夜空做背景，结构照搬 Shiro 的 Hero（apps/shiro/src/app/(app)/(home)/page.tsx）：
// 最宽 1800px，左右各占一半、内容在各自一半里居中；左边两行细字标题、一句说明和社交图标，右边 300px 圆形头像；
// 底部居中一行小字和跳动的箭头。标题文字先写死，头像、社交账号、底部那句话读后台。

async function loadOwner() {
  try {
    return await getOwner();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

const socialIcons: Record<string, React.ReactNode> = {
  GitHub: (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.74 18.27.5 12 .5Z" /></svg>
  ),
  Bilibili: (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="6.5" width="18" height="13.5" rx="3.5" /><path d="m8 3 2.5 3.5M16 3l-2.5 3.5M9 12v2M15 12v2" /></svg>
  ),
};

async function Socials() {
  const owner = await loadOwner();
  if (!owner?.socials.length) return null;
  return (
    <ul className="home-hero-socials">
      {owner.socials.map((social) => (
        <li key={social.href}>
          <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={social.label}>
            {socialIcons[social.label] ?? social.label.slice(0, 1)}
          </a>
        </li>
      ))}
    </ul>
  );
}

async function Portrait() {
  const avatar = (await loadOwner())?.avatar;
  return avatar ? (
    // eslint-disable-next-line @next/next/no-img-element -- 头像来自后台任意地址，不走 Next 图片优化
    <img className="home-hero-avatar" src={avatar} alt="Sin 的头像" width={300} height={300} fetchPriority="high" />
  ) : <span className="home-hero-avatar is-empty" aria-hidden="true" />;
}

async function Motto() {
  return (await getSiteSettings().catch(() => null))?.description ?? siteDescription;
}

export default function HomeHero() {
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <Starfield />
      <div className="home-hero-layout">
        <div className="home-hero-half is-text">
          <div className="home-hero-content">
            <h1 id="home-hero-title" className="home-hero-title">
              <span>你好，我是</span><strong>Sin</strong><span>。</span>
              <br />
              <span>一个在深夜写代码的</span><strong>大二学生</strong>
            </h1>
            <p className="home-hero-description">白天上课，晚上折腾前端、写博客、做点小东西。</p>
            <Suspense fallback={null}>
              <Socials />
            </Suspense>
          </div>
        </div>
        <div className="home-hero-half">
          <Suspense fallback={<span className="home-hero-avatar is-empty" aria-hidden="true" />}>
            <Portrait />
          </Suspense>
        </div>
      </div>
      <a className="home-hero-bottom" href="#home-room">
        <small><Suspense fallback={siteDescription}><Motto /></Suspense></small>
        <span className="home-hero-arrow" aria-hidden="true">⌄</span>
      </a>
    </section>
  );
}
