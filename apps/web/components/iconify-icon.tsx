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

type IconName = `${"logos" | "mingcute" | "simple-icons" | "skill-icons"}:${string}`;

// 后台配置里手写的图标名（如首页技术栈）要先用它确认已装的图标集里有这个图标。
export function isIconName(icon: string): icon is IconName {
  const [prefix, name] = icon.split(":");
  return Boolean(sets[prefix] && name && getIconData(sets[prefix], name));
}

export default function IconifyIcon({ icon, size = 18, className }: { icon: IconName; size?: number; className?: string }) {
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

// 社交账号的品牌标志（平台与图标对照在 lib/social.ts）；图标集里没有时用名字首字。首屏、导航面板和调试页共用。
export function SocialIcon({ icon, label, size = 18 }: { icon: string; label: string; size?: number }) {
  return isIconName(icon) ? <IconifyIcon icon={icon} size={size} /> : <>{label.slice(0, 1)}</>;
}
