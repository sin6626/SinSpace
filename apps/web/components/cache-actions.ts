"use server";

import { updateTag } from "next/cache";

// 访客在浏览器里直接写 Core（发评论、赞/踩）后调用，让列表立即显示自己刚写的内容（Next 的 read-your-own-writes）。
// 只放行这两类标签；最坏情况是有人反复调用让下次渲染多请求一次 Core，不涉及数据本身。
const allowed = { comments: "blog:comments", recently: "blog:recently" } as const;

export async function refreshAfterWrite(kinds: (keyof typeof allowed)[]) {
  for (const kind of new Set(kinds)) {
    if (Object.hasOwn(allowed, kind)) updateTag(allowed[kind]);
  }
}

// 点赞后刷新这一篇文章/手记的缓存（标签 blog:post:<id> / blog:note:<id>，见 blog-data）。
export async function refreshArticle(type: "post" | "note", id: string) {
  if ((type === "post" || type === "note") && /^[a-f\d]{24}$/i.test(id)) updateTag(`blog:${type}:${id}`);
}
