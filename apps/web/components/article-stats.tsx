"use client";

import { Heart } from "lucide-react";
import { useEffect } from "react";
import { useArticleLike } from "../lib/use-article-like";

type Props = { apiUrl: string; id: string; type: "post" | "note"; like: number };

// 文末的“喜欢”按钮（点赞逻辑在 lib/use-article-like.ts，和侧栏操作栏的心形共用），并在浏览器里上报阅读。
// 阅读上报直接发到 Core；Core 不去重，这里每个浏览器标签页只报一次。
export default function ArticleStats({ apiUrl, id, type, like }: Props) {
  const { liked, likes, message, thumbsUp } = useArticleLike({ apiUrl, id, type, like });

  useEffect(() => {
    // 开发环境不上报，免得本地调试把日常库的阅读数刷高。
    if (process.env.NODE_ENV !== "production") return;
    const readKey = `read:${type}:${id}`;
    if (sessionStorage.getItem(readKey)) return;
    sessionStorage.setItem(readKey, "1");
    void fetch(`${apiUrl}/ack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "read", payload: { type, id } }),
    }).catch(() => {});
  }, [apiUrl, id, type]);

  return (
    <>
      <button className="like-button" type="button" onClick={thumbsUp} aria-pressed={liked} disabled={liked}>
        <Heart size={18} aria-hidden="true" />
        <span>{liked ? "谢谢你的喜欢" : "喜欢这篇"}</span>
        <span className="like-count">{likes}</span>
      </button>
      {message && <span role="alert">{message}</span>}
    </>
  );
}
