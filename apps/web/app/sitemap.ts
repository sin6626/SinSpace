import type { MetadataRoute } from "next";
import { getCategories, getNavigationData, getNotes, getPosts, getSiteUrl } from "@/lib/blog-data";
import { htmlLang, localizeHref, locales } from "@/lib/i18n/config";

// 列表接口分页返回，逐页读完；每页都走 blog-data 的缓存，后台改动经 Webhook 失效。
async function readAll<T>(load: (page: number) => Promise<{ data: T[]; pagination: { totalPage: number } }>) {
  const first = await load(1);
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.pagination.totalPage - 1) }, (_, i) => load(i + 2)));
  return [first, ...rest].flatMap((result) => result.data);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, navigation, categories, posts, notes] = await Promise.all([
    getSiteUrl(),
    getNavigationData(),
    getCategories(),
    readAll((page) => getPosts(page)),
    readAll((page) => getNotes(page)),
  ]);
  const path = (...segments: string[]) => `/${segments.map(encodeURIComponent).join("/")}`;
  const pages: { url: string; lastModified?: string }[] = [
    { url: "/" },
    { url: path("posts") },
    { url: path("notes") },
    { url: path("projects") },
    { url: path("timeline") },
    { url: path("timeline", "posts") },
    { url: path("timeline", "notes") },
    { url: path("friends") },
    { url: path("says") },
    { url: path("murmurs") },
    { url: path("thinking") },
    ...navigation.pageMeta.map((page) => ({ url: path(page.slug) })),
    ...categories.map((category) => ({ url: path("categories", category.slug) })),
    ...posts.flatMap((post) => post.category
      ? [{ url: path("posts", post.category.slug, post.slug), lastModified: post.created }]
      : []),
    ...notes.map((note) => ({ url: path("notes", String(note.nid)), lastModified: note.created })),
  ];
  // 每个页面都有中文（不加前缀）、/en、/ja 三个版本，各自列出并互相标注 hreflang（文章正文有翻译时跟着换，没有时显示中文原文）
  const absolute = (url: string, locale: (typeof locales)[number]) => `${site}${localizeHref(url, locale)}`.replace(/\/$/, "") || site;
  return pages.flatMap((page) => {
    const languages = Object.fromEntries([...locales.map((locale) => [htmlLang[locale], absolute(page.url, locale)]), ["x-default", absolute(page.url, "zh")]]);
    return locales.map((locale) => ({ ...page, url: absolute(page.url, locale), alternates: { languages } }));
  });
}
