import { unstable_rethrow } from "next/navigation";
import { getPostsByTag, searchPosts } from "../lib/blog-data";
import type { ReactNode } from "react";
import ResultList, { type ResultItem } from "./result-list";
import { getT } from "../lib/i18n/server";

type Post = { id: string; title: string; created: string; slug: string; category: { name: string; slug: string } | null };

const toItems = (posts: Post[]): ResultItem[] => posts.flatMap((post) => post.category && post.slug
  ? [{ key: post.id, href: `/posts/${encodeURIComponent(post.category.slug)}/${encodeURIComponent(post.slug)}`, title: post.title, created: post.created, meta: post.category.name }]
  : []);

async function load<T>(read: () => Promise<T>) {
  try {
    return await read();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export async function PostSearch({ keyword, search, filters }: { keyword: string; search: ReactNode; filters: ReactNode }) {
  const [result, { posts: t, list }] = await Promise.all([load(() => searchPosts(keyword)), getT()]);
  const items = result && toItems(result.data);
  const summary = result ? list.searchSummary(keyword, result.total, result.data.length) : list.searchQuery(keyword);
  return <ResultList title={t.search} summary={summary} items={items} emptyText={t.searchEmpty} search={search} filters={filters} />;
}

export async function PostsByTag({ name, search, filters }: { name: string; search: ReactNode; filters: ReactNode }) {
  const [posts, { posts: t, list }] = await Promise.all([load(() => getPostsByTag(name)), getT()]);
  const items = posts && toItems(posts);
  return <ResultList title={t.tag(name)} summary={items ? list.total(items.length) : ""} items={items} emptyText={t.tagEmpty} search={search} filters={filters} />;
}
