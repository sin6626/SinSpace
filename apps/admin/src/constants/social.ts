// 后台“设置 → 用户 → 社交链接”能选的平台。key 和前台 apps/web/lib/social.ts 一一对应（scripts/verify-social-links.mjs 检查），
// 前台按 key 显示品牌图标并拼出主页地址；hint 是输入框里的提示：填 ID 或直接贴完整链接都可以。
export const socialPlatforms = [
  { key: 'github', label: 'GitHub', hint: '用户名，如 sin6626，或主页链接' },
  {
    key: 'bilibili',
    label: '哔哩哔哩',
    hint: 'UID（个人空间地址里的数字），或主页链接',
  },
  { key: 'weibo', label: '微博', hint: 'UID 或个性域名，或主页链接' },
  {
    key: 'netease',
    label: '网易云音乐',
    hint: '用户 ID（个人主页地址里的 id），或主页链接',
  },
  {
    key: 'juejin',
    label: '掘金',
    hint: '用户 ID（主页地址里的数字），或主页链接',
  },
  {
    key: 'zhihu',
    label: '知乎',
    hint: '个性域名（主页地址 people/ 后面那段），或主页链接',
  },
  { key: 'xiaohongshu', label: '小红书', hint: '用户 ID，或直接贴主页链接' },
  { key: 'douyin', label: '抖音', hint: '直接贴主页链接（ID 很长）' },
  { key: 'csdn', label: 'CSDN', hint: '用户名，或主页链接' },
  { key: 'leetcode', label: '力扣', hint: '用户名，或主页链接' },
  { key: 'gitee', label: 'Gitee', hint: '用户名，或主页链接' },
  { key: 'v2ex', label: 'V2EX', hint: '用户名，或主页链接' },
  { key: 'x', label: 'X（Twitter）', hint: '用户名（不带 @），或主页链接' },
  { key: 'telegram', label: 'Telegram', hint: '用户名，或主页链接' },
  { key: 'youtube', label: 'YouTube', hint: '频道的 @用户名，或主页链接' },
  { key: 'instagram', label: 'Instagram', hint: '用户名，或主页链接' },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    hint: '主页地址 in/ 后面那段，或主页链接',
  },
  {
    key: 'steam',
    label: 'Steam',
    hint: '自定义 ID 或 17 位数字 ID，或主页链接',
  },
  { key: 'discord', label: 'Discord', hint: '用户数字 ID，或主页链接' },
  { key: 'email', label: '邮箱', hint: '邮箱地址' },
] as const
