import { HeroSocialList } from "@/components/home-hero";
import { SocialIcon } from "@/components/iconify-icon";
import "@/components/navigation-menu.css";
import { socialLinks, socialPlatformKeys } from "@/lib/social";
import "./social-icons.css";

// 调试页“社交图标”：后台能选的平台全部填上示例账号，看首屏和导航“首页”面板在图标很多时的样子，
// 另附“悬停显示品牌色”的试用排和一排全彩版本，用来对比单色和彩色（品牌色只在这里，网站上仍是单色）。
const sampleIds: Record<string, string> = { email: "sin@example.com", steam: "76561197960287930", discord: "123456789012345678" };
const samples = socialLinks(Object.fromEntries(socialPlatformKeys.map((key) => [key, sampleIds[key] ?? "sin6626"])));

// 各平台官方品牌色（simple-icons 收录的色值）；邮箱没有品牌色，用站点强调色
const brandColors: Record<string, string> = {
  github: "#181717", bilibili: "#00A1D6", weibo: "#E6162D", netease: "#D43C33", juejin: "#007FFF", zhihu: "#0084FF",
  xiaohongshu: "#FF2442", douyin: "#000000", csdn: "#FC5531", leetcode: "#FFA116", gitee: "#C71D23", v2ex: "#1F1F1F",
  x: "#000000", telegram: "#26A5E4", youtube: "#FF0000", instagram: "#E4405F", linkedin: "#0A66C2", steam: "#000000",
  discord: "#5865F2", email: "var(--primary)",
};
// 品牌色接近黑色的几个：熄灯时悬停改成“品牌色圆底 + 白色图标”（也是它们官方标志的样子），否则黑图标在夜空上看不见
const darkBrands = new Set(["github", "douyin", "v2ex", "x", "steam"]);

export default function SocialIconsPreview() {
  return (
    <>
      <p className="post-meta">首屏（home-hero.tsx 的 HeroSocialList，真实组件）：后台能选的 {samples.length} 个平台全部填上时，左栏最宽 42rem，放不下会换行</p>
      <div className="debug-social-hero">
        <HeroSocialList socials={samples} />
      </div>

      <p className="post-meta">试用：平时和首屏一样单色，鼠标移上去（或 Tab 聚焦）变成各平台自己的颜色；GitHub、X、抖音、Steam、V2EX 这种深色品牌在熄灯时变成品牌色圆底 + 白色图标</p>
      <div className="debug-social-hero">
        <ul className="home-hero-socials debug-social-hover">
          {samples.map((social) => (
            <li key={social.key} data-dark={darkBrands.has(social.key) ? "" : undefined} style={{ "--brand": brandColors[social.key] } as React.CSSProperties}>
              <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={social.label}>
                <SocialIcon icon={social.icon} label={social.label} />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <p className="post-meta">对比：同一排换成各平台的品牌色（只在调试页，网站上没用）。深色的 GitHub、X、抖音、Steam、V2EX 在夜空上发暗，只靠圆底勉强看得出</p>
      <div className="debug-social-hero">
        <ul className="home-hero-socials debug-social-brand">
          {samples.map((social) => (
            <li key={social.key} style={{ "--brand": brandColors[social.key] } as React.CSSProperties}>
              <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={social.label}>
                <SocialIcon icon={social.icon} label={social.label} />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <p className="post-meta">导航“首页”面板左栏的样子（照真实面板的类名拼出来，统计数字是示例）</p>
      <div className="nav-panel is-home debug-social-panel">
        <section className="nav-panel-side">
          <p className="nav-panel-label">此间</p>
          <dl className="nav-stats">
            <div><dt>篇文字</dt><dd>24</dd></div>
            <div><dt>万字</dt><dd>7.3</dd></div>
            <div><dt>天</dt><dd>194</dd></div>
          </dl>
          <ul className="nav-socials">
            {samples.map((social) => (
              <li key={social.key}>
                <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={social.label}>
                  <SocialIcon icon={social.icon} label={social.label} size={15} />
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section className="nav-panel-main">
          <p className="nav-panel-label">页面</p>
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
