import "server-only";
import logos from "@iconify-json/logos/icons.json";
import mingcute from "@iconify-json/mingcute/icons.json";
import simpleIcons from "@iconify-json/simple-icons/icons.json";
import skillIcons from "@iconify-json/skill-icons/icons.json";
import { getIconData, iconToSVG } from "@iconify/utils";
import type { IconifyJSON } from "@iconify/types";

// Iconify 图标：在服务端从离线图标集里取出来渲染成 SVG，不在浏览器里联网拉取，也不把整套图标打进前端代码。
// 目前装了三套：simple-icons（单色品牌标志，如 GitHub、哔哩哔哩）、mingcute（Shiro 用的那套圆润线条图标）、
// skill-icons（带品牌色的技术栈方块图标，首页技术栈用）、logos（彩色品牌标志，登录用的 Google）。
// 通用图标仍然用 lucide-react；Lucide 没有的（品牌、需要更精致的）才用这里。
const sets: Record<string, IconifyJSON> = { logos, mingcute, "simple-icons": simpleIcons, "skill-icons": skillIcons };

export default function IconifyIcon({ icon, size = 18, className }: { icon: `${"logos" | "mingcute" | "simple-icons" | "skill-icons"}:${string}`; size?: number; className?: string }) {
  const [prefix, name] = icon.split(":");
  const data = getIconData(sets[prefix], name);
  if (!data) return null;
  const { attributes, body } = iconToSVG(data, { height: size });
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={attributes.viewBox}
      width={attributes.width}
      height={attributes.height}
      className={className}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

// 社交账号的品牌标志（后台个人资料里的 socialIds，见 blog-data.ts 的 socialLinks）；没有对应图标时用名字首字。首屏和导航面板共用。
const socialIconNames: Record<string, `simple-icons:${string}`> = {
  GitHub: "simple-icons:github",
  Bilibili: "simple-icons:bilibili",
};

export function SocialIcon({ label, size = 18 }: { label: string; size?: number }) {
  const icon = socialIconNames[label];
  return icon ? <IconifyIcon icon={icon} size={size} /> : <>{label.slice(0, 1)}</>;
}
