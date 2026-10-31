import { unstable_rethrow } from "next/navigation";
import { getNavigationData } from "../lib/blog-data";
import { getLocale, getT } from "../lib/i18n/server";
import CommandSearch from "./command-search";

// ⌘K 搜索弹窗的服务端部分：输入框空着时列出的“去处”——导航里的各个角落和后台页面（页面读不到时只列导航）。
export default async function HeaderSearch() {
  const [{ nav: t }, locale] = await Promise.all([getT(), getLocale()]);
  let pages: { label: string; href: string; note?: string }[] = [];
  try {
    const data = await getNavigationData(locale);
    pages = data.pageMeta.map((page) => ({ label: page.title, href: `/${encodeURIComponent(page.slug)}`, note: page.subtitle ?? undefined }));
  } catch (error) {
    unstable_rethrow(error);
  }
  return (
    <CommandSearch
      links={[
        { label: t.home, href: "/" },
        { label: t.posts, href: "/posts" },
        { label: t.notes, href: "/notes" },
        { label: t.timeline, href: "/timeline" },
        { label: t.murmurs, href: "/murmurs" },
        ...(["projects", "friends", "says", "thinking"] as const).map((key) => ({ label: t.moreLinks[key].label, href: `/${key}`, note: t.moreLinks[key].note })),
        ...pages,
      ]}
    />
  );
}
