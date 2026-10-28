import { ChevronDown } from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { getOwner, getSiteLikes, getSiteSettings, getSubscribeOptions, siteDescription, siteName } from "../lib/blog-data";
import { getApiUrl } from "../lib/config";
import IconifyIcon, { SocialIcon } from "./iconify-icon";
import ScrollHint from "./scroll-hint";
import SiteActions from "./site-actions";
import Starfield from "./starfield";
// 首屏标题与说明用霞鹜文楷（简体版，npm 包已按字符切成小块，浏览器只下载页面上用到的字）；只引细体和常规两档
import "lxgw-wenkai-webfont/lxgwwenkai-light.css";
import "lxgw-wenkai-webfont/lxgwwenkai-regular.css";
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

async function Socials() {
  const owner = await loadOwner();
  if (!owner?.socials.length) return null;
  return (
    <ul className="home-hero-socials">
      {owner.socials.map((social) => (
        <li key={social.href}>
          <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={social.label}>
            <SocialIcon label={social.label} />
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

// 丛雨抱着名字：身体（后层、闭眼帧）在字后面，手臂（前层）在字前面，三张图画布一致、叠在同一位置。
// 素材在 public/mascot，由 scripts/prepare-mascot.mjs 从生图结果抠图生成；纯装饰，读屏只读到“Sin”。
function MascotLayer({ layer }: { layer: "back" | "blink" | "front" }) {
  // eslint-disable-next-line @next/next/no-img-element -- 三层要像素级叠在一起，直接用原图，不走响应式裁切
  return <img className={`home-hero-mascot is-${layer}`} src={`/mascot/${layer}.webp`} alt="" aria-hidden="true" width={720} height={525} draggable={false} />;
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
              <span>你好，我是</span>
              {/* “Sin。”包成一块：窄屏放不下一行时一起换行，句号不会单独掉到下一行 */}
              <span>
                <strong className="home-hero-name">
                  <MascotLayer layer="back" />
                  <MascotLayer layer="blink" />
                  Sin
                  <MascotLayer layer="front" />
                  <span className="home-hero-star" aria-hidden="true" />
                </strong>
                <span>。</span>
              </span>
              <br />
              <span>一个在深夜写代码的</span><strong>大三学生</strong>
            </h1>
            <p className="home-hero-description">
              白天上课，晚上折腾前端、写博客、做点小东西。
              <br />
              探索全栈与设计的普通开发者。
            </p>
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
