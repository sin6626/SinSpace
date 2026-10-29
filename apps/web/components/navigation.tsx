import { Suspense, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import { getNavigationData, getNavigationPanels, getOwner } from "../lib/blog-data";
import { SocialIcon } from "./iconify-icon";
import NavigationMenu, { type NavigationState } from "./navigation-menu";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function links(value: unknown, labelKey: "name" | "title", prefix: string) {
  if (!Array.isArray(value)) throw new Error("导航数据格式错误");
  return value.map((item: unknown) => {
    if (!isRecord(item)) throw new Error("导航条目格式错误");
    const label = item[labelKey];
    const slug = item.slug;
    if (
      typeof label !== "string" || !label.trim() ||
      typeof slug !== "string" || !slug.trim() || slug === "." || slug === ".."
    ) throw new Error("导航条目格式错误");
    return { label, href: `${prefix}${encodeURIComponent(slug)}` };
  });
}

async function NavigationData({ account }: { account?: ReactNode }) {
  let state: NavigationState;
  try {
    // 悬停面板的数据和站长社交账号读不到时不影响导航本身，面板退回简单列表
    const [data, panels, owner] = await Promise.all([
      getNavigationData(),
      getNavigationPanels().catch((error) => { unstable_rethrow(error); return null; }),
      getOwner().catch((error) => { unstable_rethrow(error); return null; }),
    ]);
    state = {
      status: "ready",
      pages: links(data.pageMeta, "title", "/"),
      panels,
      socials: (owner?.socials ?? []).map((social) => ({ ...social, icon: <SocialIcon label={social.label} size={15} /> })),
    };
  } catch (error) {
    unstable_rethrow(error);
    state = { status: "error" };
  }
  return <NavigationMenu state={state} account={account} />;
}

export default function Navigation({ account }: { account?: ReactNode }) {
  return (
    <Suspense fallback={<p className="navigation-message" role="status">正在读取导航…</p>}>
      <NavigationData account={account} />
    </Suspense>
  );
}
