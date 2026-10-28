import { ChevronDown } from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { getOwner, getSiteLikes, getSiteSettings, getSubscribeOptions, siteDescription, siteName } from "../lib/blog-data";
import { getApiUrl } from "../lib/config";
import IconifyIcon from "./iconify-icon";
import ScrollHint from "./scroll-hint";
import SiteActions from "./site-actions";
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

// 社交账号用真实的品牌标志（Iconify 的 simple-icons）。
const socialIcons: Record<string, React.ReactNode> = {
  GitHub: <IconifyIcon icon="simple-icons:github" size={18} />,
  Bilibili: <IconifyIcon icon="simple-icons:bilibili" size={18} />,
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

// 喜欢本站的计数和订阅开关都是缓存数据，读不到时按钮照常显示（计数隐藏、订阅按钮不出现）。
async function Actions() {
  const [likes, subscribe, settings] = await Promise.all([getSiteLikes().catch(() => null), getSubscribeOptions().catch(() => null), getSiteSettings().catch(() => null)]);
  return (
    <SiteActions
      apiUrl={getApiUrl()}
      siteName={settings?.name ?? siteName}
      likes={likes}
      subscribeTypes={subscribe?.enabled ? subscribe.types : null}
      mailIcon={<IconifyIcon icon="mingcute:mail-send-fill" size={20} />}
    />
  );
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
              <span>你好，我是</span><strong>Sin<span className="home-hero-star" aria-hidden="true" /></strong><span>。</span>
              <br />
              <span>一个在深夜写代码的</span><strong>大三学生</strong>
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
      <div className="home-hero-bottom">
        <Suspense fallback={null}>
          <Actions />
        </Suspense>
        <ScrollHint className="home-hero-scroll" target="home-room">
          <small><Suspense fallback={siteDescription}><Motto /></Suspense></small>
          <ChevronDown className="home-hero-arrow" size={24} strokeWidth={1.5} aria-hidden="true" />
        </ScrollHint>
      </div>
    </section>
  );
}
