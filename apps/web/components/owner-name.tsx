import { getSiteSettings, siteOwnerName } from "../lib/blog-data";

// 站长名字（后台“个人资料”的名字），首屏问候、页脚落款用它，和站名“名字’s Yozora”同一个来源；读取失败时用兜底的 Sin。
// 外面要包 Suspense（fallback 用 siteOwnerName），不挡住所在区域的首屏渲染。
export default async function OwnerName() {
  return (await getSiteSettings().catch(() => null))?.ownerName ?? siteOwnerName;
}
