// 碎碎念图片的宽度规则，和后台 apps/admin/src/views/murmurs/murmur-images.ts 一致：
// 宽度写在 Markdown 图片标题里 ![](地址 "w=40%")，是占卡片宽度的百分比，10%–100%，没写就是 100%。
// scripts/verify-murmur-images.mjs 同时检查两边。
export function murmurImageWidth(title: string | null | undefined) {
  const match = title?.match(/^w=(\d{1,3})%$/);
  return match ? Math.min(100, Math.max(10, Number(match[1]))) : 100;
}

// 正文里的图片地址（首页预览的缩略图用），只放行 http(s)
export function murmurImageSources(content: string) {
  return [...content.matchAll(/!\[[^\]]*\]\((\S+?)(?:\s+"[^"]*")?\)/g)].map((match) => match[1]).filter((src) => /^https?:\/\//i.test(src));
}
