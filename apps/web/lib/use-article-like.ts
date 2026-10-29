import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { refreshArticle } from "../components/cache-actions";

// 文章/手记的“喜欢”：文末的“喜欢这篇”和侧栏操作栏里的心形共用这一份状态，点了任意一个，另一个立刻跟着变。
// 点赞直接从浏览器发到 Core（按访客 IP 去重，经 Next 转发会变成所有人共用服务器 IP）；是否点过记在本地 liked:<type>:<id>。
// 成功后本页的数字先就地 +1，再让这一篇的缓存失效并刷新，拿到服务端的新数字后就不再用本地 +1。
const listeners = new Set<() => void>();
const bumped = new Set<string>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useArticleLike({ apiUrl, id, type, like }: { apiUrl: string; id: string; type: "post" | "note"; like: number }) {
  const router = useRouter();
  const likedKey = `liked:${type}:${id}`;
  const liked = useSyncExternalStore(subscribe, () => localStorage.getItem(likedKey) === "1", () => false);
  // 本页刚点赞成功、服务端数字还没刷新回来时 +1；刷新后 like 变了就以服务端为准
  const bump = useSyncExternalStore(subscribe, () => bumped.has(`${likedKey}:${like}`), () => false);
  const [message, setMessage] = useState("");

  async function thumbsUp() {
    if (liked) return;
    try {
      const response = await fetch(`${apiUrl}/activity/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type }),
      });
      const body = response.ok ? null : await response.json().catch(() => null) as { code?: number; message?: string } | null;
      // 12003：这个 IP 已经点过赞
      if (!response.ok && body?.code !== 12003) return setMessage(body?.message || "点赞失败，请稍后重试");
      if (response.ok) bumped.add(`${likedKey}:${like}`);
      localStorage.setItem(likedKey, "1");
      setMessage("");
      notify();
      if (response.ok) {
        await refreshArticle(type, id);
        router.refresh();
      }
    } catch {
      setMessage("网络错误，点赞失败");
    }
  }

  return { liked, likes: like + (bump ? 1 : 0), message, thumbsUp };
}
