import type { CSSProperties } from "react";
import { HeroSocialList } from "@/components/home-hero";
import { SocialIcon } from "@/components/iconify-icon";
import "@/components/navigation-menu.css";
import { socialLinks, socialPlatformKeys } from "@/lib/social";
import "./social-icons.css";

// 调试页“社交图标”：后台能选的平台全部填上示例账号，看首屏和导航“首页”面板在图标很多时的样子，
// 网站上平时单色、悬停换成品牌色（2026-10-31 用户选定）；另附一排全彩版本做对比。
const sampleIds: Record<string, string> = { email: "sin@example.com", steam: "76561197960287930", discord: "123456789012345678" };
const samples = socialLinks(Object.fromEntries(socialPlatformKeys.map((key) => [key, sampleIds[key] ?? "sin6626"])));

export default function SocialIconsPreview() {
  return (
    <>
      <p className="post-meta">首屏（home-hero.tsx 的 HeroSocialList，真实组件）：后台能选的 {samples.length} 个平台全部填上时，左栏最宽 42rem，放不下会换行；平时单色，鼠标移上去（或 Tab 聚焦）换成平台自己的颜色，GitHub、X、抖音、Steam、V2EX 这种深色品牌熄灯时是品牌色圆底 + 白色图标</p>
      <div className="debug-social-hero">
        <HeroSocialList socials={samples} />
      </div>

      <p className="post-meta">对比：一直显示品牌色的全彩版本（只在调试页，网站上没用）。深色的 GitHub、X、抖音、Steam、V2EX 在夜空上发暗，只靠圆底勉强看得出</p>
      <div className="debug-social-hero">
        <ul className="home-hero-socials debug-social-brand">
          {samples.map((social) => (
            <li key={social.key} style={{ "--brand": social.color } as CSSProperties}>
              <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={social.label}>
                <SocialIcon icon={social.icon} label={social.label} />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <p className="post-meta">导航“首页”面板的样子（照真实面板的类名拼出来，数字和页面是示例；社交账号在右下角，悬停同样换成品牌色）</p>
      <div className="nav-panel is-home debug-social-panel">
        <section className="nav-panel-side nav-night">
          <p className="nav-night-count"><b>194</b><span>夜</span></p>
          <p className="nav-night-foot"><span>24 篇</span><span>7.3 万字</span></p>
        </section>
        <section className="nav-panel-main nav-home-main">
          <p className="nav-panel-empty">（页面列表）</p>
          <ul className="nav-socials">
            {samples.map((social) => (
              <li key={social.key} data-dark={social.dark ? "" : undefined} style={{ "--brand": social.color } as CSSProperties}>
                <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={social.label}>
                  <SocialIcon icon={social.icon} label={social.label} size={15} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="post-meta">每个平台填 ID 时拼出的地址（鼠标停在上面的图标上也能看到名字）</p>
      <ul className="debug-social-urls">
        {samples.map((social) => (
          <li key={social.key}><span>{social.label}</span><code>{social.href}</code></li>
        ))}
      </ul>
    </>
  );
}
