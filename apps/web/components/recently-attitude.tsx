"use client";

import { useState, useSyncExternalStore } from "react";

type Attitude = "up" | "down";
const noSubscribe = () => () => {};

// 思考（Core 的“动态”）的赞/踩。直接从浏览器请求 Core（按访客 IP 记录）：
// 再点同一个是取消，点另一个是改投；Core 返回 1 表示已投、-1 表示已取消。上次的选择记在本地，只用于显示。
export default function RecentlyAttitude({ apiUrl, id, up, down }: { apiUrl: string; id: string; up: number; down: number }) {
  const key = `attitude:${id}`;
  const stored = useSyncExternalStore(noSubscribe, () => localStorage.getItem(key) as Attitude | null, () => null);
  const [state, setState] = useState<{ mine: Attitude | null; up: number; down: number } | null>(null);
  const current = state ?? { mine: stored, up, down };
  const [pending, setPending] = useState(false);

  async function vote(attitude: Attitude) {
    setPending(true);
    try {
      const response = await fetch(`${apiUrl}/recently/attitude/${id}?attitude=${attitude === "up" ? 0 : 1}`);
      const body = response.ok ? await response.json().catch(() => null) as { code?: number } | null : null;
      if (!body) return;
      const next = { ...current };
      if (current.mine) next[current.mine] -= 1;
      next.mine = body.code === -1 ? null : attitude;
      if (next.mine) next[next.mine] += 1;
      if (next.mine) localStorage.setItem(key, next.mine);
      else localStorage.removeItem(key);
      setState(next);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button className="article-like" type="button" aria-pressed={current.mine === "up"} disabled={pending} onClick={() => vote("up")}>赞 {current.up}</button>
      <button className="article-like" type="button" aria-pressed={current.mine === "down"} disabled={pending} onClick={() => vote("down")}>踩 {current.down}</button>
    </>
  );
}
