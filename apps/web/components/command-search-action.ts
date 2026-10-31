"use server";

import { isTranslationLanguage, searchNotes, searchPosts } from "../lib/blog-data";

export type SearchHit = { id: string; href: string; title: string; created: string; meta?: string };
export type SearchResult = { posts: SearchHit[]; notes: SearchHit[]; postTotal: number; noteTotal: number };

// ⌘K 搜索弹窗的服务端部分：文章和手记一起搜（Core 的搜索接口，复用 blog-data 的 60 秒缓存），
// 外文页面把标题和分类名换成译文。读取失败返回 null，由弹窗显示“搜索失败”。
export async function quickSearch(keyword: string, lang: string): Promise<SearchResult | null> {
  const query = typeof keyword === "string" ? keyword.trim().slice(0, 100) : "";
  if (!query) return { posts: [], notes: [], postTotal: 0, noteTotal: 0 };
  const contentLang = isTranslationLanguage(lang) ? lang : "zh";
  try {
    const [posts, notes] = await Promise.all([searchPosts(query, contentLang), searchNotes(query, contentLang)]);
    return {
      posts: posts.data.flatMap((post) => post.category && post.slug
        ? [{ id: post.id, href: `/posts/${encodeURIComponent(post.category.slug)}/${encodeURIComponent(post.slug)}`, title: post.title, created: post.created, meta: post.category.name }]
        : []),
      notes: notes.data.map((note) => ({ id: note.id, href: `/notes/${note.nid}`, title: note.title, created: note.created })),
      postTotal: posts.total,
      noteTotal: notes.total,
    };
  } catch {
    return null;
  }
}
