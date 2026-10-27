import { unstable_rethrow } from "next/navigation";
import { getPostsByTag, searchPosts } from "../lib/blog-data";
import type { ReactNode } from "react";
import ResultList, { type ResultItem } from "./result-list";

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

export async function PostSearch({ keyword, toolbar }: { keyword: string; toolbar: ReactNode }) {
  const result = await load(() => searchPosts(keyword));
  const items = result && toItems(result.data);
  const summary = result
    ? `搜索“${keyword}”，共 ${result.total} 篇${result.total > result.data.length ? `，显示前 ${result.data.length} 篇` : ""}`
    : `搜索“${keyword}”`;
  return <ResultList title="搜索文章" summary={summary} items={items} emptyText="没有匹配的文章，换个关键词试试。" toolbar={toolbar} />;
}

export async function PostsByTag({ name, toolbar }: { name: string; toolbar: ReactNode }) {
  const posts = await load(() => getPostsByTag(name));
  const items = posts && toItems(posts);
  return <ResultList title={`标签：${name}`} summary={items ? `共 ${items.length} 篇` : ""} items={items} emptyText="这个标签下还没有已发布的文章。" toolbar={toolbar} />;
}
