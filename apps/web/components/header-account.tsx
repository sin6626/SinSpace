import { unstable_rethrow } from "next/navigation";
import { getLoginProviders, getOwner, getSiteSettings, siteName } from "../lib/blog-data";
import { getApiUrl } from "../lib/config";
import AccountMenu from "./account-menu";
import IconifyIcon from "./iconify-icon";

// 品牌标志在服务端渲染好交给客户端：GitHub 本身是单色标志（跟随文字颜色），Google 用彩色的 G
const icons = {
  github: <IconifyIcon icon="simple-icons:github" size={20} />,
  google: <IconifyIcon icon="logos:google-icon" size={20} />,
};

// 读者登录入口的服务端部分：后台启用了哪些登录方式、登录弹窗上的站名与站长头像。
// host：页头那份（挂载全站唯一的登录弹窗）；手机菜单底部那份只放按钮。
export default async function HeaderAccount({ host = false, side }: { host?: boolean; side?: "bottom" | "top" }) {
  let providers: Awaited<ReturnType<typeof getLoginProviders>> = [];
  let site: { name: string; avatar?: string } = { name: siteName };
  try {
    const [enabled, settings, owner] = await Promise.all([
      getLoginProviders(),
      getSiteSettings().catch(() => null),
      getOwner().catch(() => null),
    ]);
    providers = enabled;
    site = { name: settings?.name ?? siteName, avatar: owner?.avatar };
  } catch (error) {
    unstable_rethrow(error);
  }
  return <AccountMenu apiUrl={getApiUrl()} host={host} side={side} site={site} providers={providers.map((id) => ({ id, icon: icons[id] }))} />;
}
