// 后台“设置 → 用户 → 社交链接”的平台：键名和后台 apps/admin/src/constants/social.ts 一一对应
// （scripts/verify-social-links.mjs 检查两边一致）。每项可以填 ID（自动拼成主页地址）或直接贴完整链接（http/https 原样使用）。
// 图标是 Iconify 离线图标集里的品牌标志（components/iconify-icon.tsx 渲染），单色、跟随文字颜色。
type Platform = { label: string; icon: string; url: (id: string) => string };

const platforms: Record<string, Platform> = {
  github: { label: "GitHub", icon: "simple-icons:github", url: (id) => `https://github.com/${id}` },
  bilibili: { label: "哔哩哔哩", icon: "simple-icons:bilibili", url: (id) => `https://space.bilibili.com/${id}` },
  weibo: { label: "微博", icon: "simple-icons:sinaweibo", url: (id) => `https://weibo.com/${id}` },
  netease: { label: "网易云音乐", icon: "simple-icons:neteasecloudmusic", url: (id) => `https://music.163.com/#/user/home?id=${id}` },
  juejin: { label: "掘金", icon: "simple-icons:juejin", url: (id) => `https://juejin.cn/user/${id}` },
  zhihu: { label: "知乎", icon: "simple-icons:zhihu", url: (id) => `https://www.zhihu.com/people/${id}` },
  xiaohongshu: { label: "小红书", icon: "simple-icons:xiaohongshu", url: (id) => `https://www.xiaohongshu.com/user/profile/${id}` },
  // 抖音与 TikTok 是同一个音符标志
  douyin: { label: "抖音", icon: "simple-icons:tiktok", url: (id) => `https://www.douyin.com/user/${id}` },
  csdn: { label: "CSDN", icon: "simple-icons:csdn", url: (id) => `https://blog.csdn.net/${id}` },
  leetcode: { label: "力扣", icon: "simple-icons:leetcode", url: (id) => `https://leetcode.cn/u/${id}` },
  gitee: { label: "Gitee", icon: "simple-icons:gitee", url: (id) => `https://gitee.com/${id}` },
  v2ex: { label: "V2EX", icon: "simple-icons:v2ex", url: (id) => `https://www.v2ex.com/member/${id}` },
  x: { label: "X", icon: "simple-icons:x", url: (id) => `https://x.com/${id}` },
  telegram: { label: "Telegram", icon: "simple-icons:telegram", url: (id) => `https://t.me/${id}` },
  youtube: { label: "YouTube", icon: "simple-icons:youtube", url: (id) => `https://www.youtube.com/@${id}` },
  instagram: { label: "Instagram", icon: "simple-icons:instagram", url: (id) => `https://www.instagram.com/${id}` },
  linkedin: { label: "LinkedIn", icon: "simple-icons:linkedin", url: (id) => `https://www.linkedin.com/in/${id}` },
  // Steam 的个人资料有两种：自定义 ID（/id/xxx）和 17 位数字 ID（/profiles/7656…）
  steam: { label: "Steam", icon: "simple-icons:steam", url: (id) => (/^\d{17}$/.test(id) ? `https://steamcommunity.com/profiles/${id}` : `https://steamcommunity.com/id/${id}`) },
  discord: { label: "Discord", icon: "simple-icons:discord", url: (id) => `https://discord.com/users/${id}` },
  email: { label: "邮箱", icon: "mingcute:mail-fill", url: (id) => `mailto:${id}` },
};
// 旧数据里可能用 twitter 作键名（Shiro 时代），按 X 处理
const aliases: Record<string, string> = { twitter: "x" };

export const socialPlatformKeys = Object.keys(platforms);

export type SocialLink = { key: string; label: string; href: string; icon: string };

export function socialLinks(ids: unknown): SocialLink[] {
  if (!ids || typeof ids !== "object") return [];
  return Object.entries(ids as Record<string, unknown>).flatMap(([rawKey, value]) => {
    const key = aliases[rawKey.toLowerCase()] ?? rawKey.toLowerCase();
    const platform = platforms[key];
    const text = typeof value === "string" ? value.trim() : "";
    if (!platform || !text) return [];
    const base = { key, label: platform.label, icon: platform.icon };
    // 贴的是完整链接：只放行 http(s)，原样使用
    if (/^https?:\/\//i.test(text)) return /^https?:\/\/[^\s]+$/i.test(text) ? [{ ...base, href: text }] : [];
    if (key === "email") return /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(text) ? [{ ...base, href: platform.url(text) }] : [];
    // 填的是 ID：去掉问号后面的跟踪参数（如 B 站的 spm）和开头的 @，不能含空白或斜杠
    const id = text.split("?")[0].replace(/^@/, "");
    return /^[^\s/#]+$/.test(id) ? [{ ...base, href: platform.url(encodeURIComponent(id)) }] : [];
  });
}
