"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { refreshArticle } from "./cache-actions";

const noSubscribe = () => () => {};

type Props = { apiUrl: string; id: string; type: "post" | "note"; read: number; like: number };

// 阅读数与点赞。两者都直接从浏览器发到 Core：点赞按访客 IP 去重，经 Next 转发会变成所有人共用服务器 IP。
// 数字来自页面缓存，可能比实际略旧；本次点赞成功后就地 +1。
// Core 的阅读上报不去重，这里每个浏览器标签页只报一次；点赞状态记在本地，换浏览器后由 Core 按 IP 判断。
export default function ArticleStats({ apiUrl, id, type, read, like }: Props) {
  const router = useRouter();
  const likedKey = `liked:${type}:${id}`;
  const [likedCount, setLikedCount] = useState<{ base: number; value: number } | null>(null);
  // 刷新后拿到服务端的新点赞数，就不再用本地 +1 的结果。
  if (likedCount && likedCount.base !== like) setLikedCount(null);
  const likes = likedCount?.value ?? like;
  // 本地存储只在浏览器读取，服务端首帧按未点赞渲染。
  const likedBefore = useSyncExternalStore(noSubscribe, () => localStorage.getItem(likedKey) === "1", () => false);
  const [likedNow, setLikedNow] = useState(false);
  const liked = likedBefore || likedNow;
  const [message, setMessage] = useState("");

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
  }, [apiUrl, id, type, likedKey]);

  async function thumbsUp() {
    if (liked) return;
    try {
      const response = await fetch(`${apiUrl}/activity/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type }),
      });
      const body = response.ok ? null : await response.json().catch(() => null) as { code?: number; message?: string } | null;
      // 12003：这个 IP 已经点过赞。
      if (!response.ok && body?.code !== 12003) return setMessage(body?.message || "点赞失败，请稍后重试");
      if (response.ok) setLikedCount({ base: like, value: like + 1 });
      localStorage.setItem(likedKey, "1");
      setLikedNow(true);
      setMessage("");
      if (response.ok) {
        // 详情页有缓存，让这一篇的缓存失效并刷新，否则刷新页面会看到旧的点赞数。
        await refreshArticle(type, id);
        router.refresh();
      }
    } catch {
      setMessage("网络错误，点赞失败");
    }
  }

  return (
    <>
      <span>阅读 {read}</span>
      <button className="article-like" type="button" onClick={thumbsUp} aria-pressed={liked} disabled={liked}>
        {liked ? "已赞" : "点赞"} {likes}
      </button>
      {message && <span role="alert">{message}</span>}
    </>
  );
}
