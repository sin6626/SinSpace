import { unstable_rethrow } from "next/navigation";
import { getLoginProviders } from "../lib/blog-data";
import { getApiUrl } from "../lib/config";
import AccountMenu from "./account-menu";
import IconifyIcon from "./iconify-icon";

// 页头登录入口的服务端部分：读后台启用了哪些登录方式，品牌图标在服务端渲染好再交给客户端组件
export default async function HeaderAccount({ side }: { side?: "bottom" | "top" }) {
  let providers: Awaited<ReturnType<typeof getLoginProviders>> = [];
  try {
    providers = await getLoginProviders();
  } catch (error) {
    unstable_rethrow(error);
  }
  const icons = { github: <IconifyIcon icon="simple-icons:github" size={16} />, google: <IconifyIcon icon="simple-icons:google" size={16} /> };
  return <AccountMenu apiUrl={getApiUrl()} side={side} providers={providers.map((id) => ({ id, icon: icons[id] }))} />;
}
