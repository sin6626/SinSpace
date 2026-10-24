import type { MetadataRoute } from "next";
import { getCategories, getNavigationData, getNotes, getPosts, getSiteUrl } from "@/lib/blog-data";

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
  const path = (...segments: string[]) => `${site}/${segments.map(encodeURIComponent).join("/")}`;
  return [
    { url: site },
    { url: path("posts") },
    { url: path("notes") },
    { url: path("projects") },
    { url: path("friends") },
    { url: path("says") },
    { url: path("thinking") },
    ...navigation.pageMeta.map((page) => ({ url: path(page.slug) })),
    ...categories.map((category) => ({ url: path("categories", category.slug) })),
    ...posts.flatMap((post) => post.category
      ? [{ url: path("posts", post.category.slug, post.slug), lastModified: post.created }]
      : []),
    ...notes.map((note) => ({ url: path("notes", String(note.nid)), lastModified: note.created })),
  ];
}
