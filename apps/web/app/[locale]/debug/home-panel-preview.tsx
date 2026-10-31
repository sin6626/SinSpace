import { SocialIcon } from "@/components/iconify-icon";
import { HomePanelPreview } from "@/components/navigation-menu";
import { socialLinks, socialPlatformKeys } from "@/lib/social";
import "./home-panel-preview.css";

// 调试页“导航首页面板”：真实的 HomePanel，直接摆在页面上。一份是现在的规模，一份是以后页面、社交账号都很多时的样子。
// 数字、页面、账号都是示例。
const stats = { writings: 24, words: 73000, days: 194 };

const fewPages = [
  { label: "关于我", href: "/about", note: "一个在深夜写代码的大三学生" },
  { label: "关于本站", href: "/about-site", note: "这里是怎么搭起来的" },
];

const manyPages = [
  ...fewPages,
  { label: "留言板", href: "/message", note: "路过的话留一句" },
  { label: "一对一咨询", href: "/consult", note: "前端、学习路线、找实习都可以聊" },
  { label: "历史", href: "/history", note: "这个站从 2026 年夏天开始" },
  { label: "迭代", href: "/changelog", note: "每一次改版都记在这里" },
  { label: "友链说明", href: "/friends-rule", note: "交换友链前先看看" },
  { label: "赞助", href: "/sponsor" },
  { label: "装备", href: "/uses", note: "电脑、键盘和常用软件" },
  { label: "书单与片单，这个名字故意写得很长", href: "/books", note: "读过的书、看过的电影，还有一些没看完的，副标题也故意写得很长" },
  { label: "人设", href: "/persona", note: "Sin 是谁" },
  { label: "现在", href: "/now" },
];

// 再多一些（13 个起分三栏）
const lotsPages = [
  ...manyPages,
  { label: "相册", href: "/photos", note: "手机里舍不得删的照片" },
  { label: "歌单", href: "/music", note: "写代码时循环的歌" },
  { label: "刷题记录", href: "/leetcode", note: "大一那年" },
  { label: "项目复盘", href: "/review" },
  { label: "订阅", href: "/subscribe", note: "RSS 与邮件" },
  { label: "隐私说明", href: "/privacy", note: "这里收集了什么" },
];

const toSocials = (ids: Record<string, string>) => socialLinks(ids).map((social) => ({
  ...social,
  icon: <SocialIcon icon={social.icon} label={social.label} size={15} />,
}));

const fewSocials = toSocials({ github: "sin6626", bilibili: "sin6626", x: "sin6626" });
const sampleIds: Record<string, string> = { email: "sin@example.com", steam: "76561197960287930", discord: "123456789012345678" };
const manySocials = toSocials(Object.fromEntries(socialPlatformKeys.map((key) => [key, sampleIds[key] ?? "sin6626"])));

export default function HomePanelPreviews() {
  return (
    <>
      <p className="post-meta">现在的规模：{fewPages.length} 个页面、{fewSocials.length} 个社交账号</p>
      <div className="debug-home-panel"><HomePanelPreview pages={fewPages} socials={fewSocials} stats={stats} /></div>
      <p className="post-meta">以后很多：{manyPages.length} 个页面（有的没写副标题、有一个名字和副标题都很长）、{manySocials.length} 个社交账号（后台能选的全部）</p>
      <div className="debug-home-panel"><HomePanelPreview pages={manyPages} socials={manySocials} stats={stats} /></div>
      <p className="post-meta">再多：{lotsPages.length} 个页面（13 个起分三栏）、{manySocials.length} 个社交账号</p>
      <div className="debug-home-panel"><HomePanelPreview pages={lotsPages} socials={manySocials} stats={stats} /></div>
    </>
  );
}
