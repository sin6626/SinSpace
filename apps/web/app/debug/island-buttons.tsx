"use client";

import { useIsland } from "../../lib/island-store";

// 在页头夜航岛上播报几条示例活动（只在本页触发，不走 WebSocket）。
const samples = [
  { icon: "info", title: "一条示例活动", detail: "岛会临时变形播报，几秒后缩回" },
  { icon: "post", title: "有新文章了", detail: "《Plate V1 和 V2对比》", href: "/posts", duration: 5000 },
  { icon: "update", title: "文章有更新", detail: "你正在阅读的文章已修改，稍后刷新可查看最新内容。" },
  { icon: "remove", title: "这篇文章已移除", detail: "当前文章已删除，可以返回文章列表继续阅读。" },
] as const;

export default function IslandButtons() {
  const push = useIsland((state) => state.push);
  return (
    <div className="post-categories">
      {samples.map((sample) => (
        <button key={sample.title} className="notification-close" type="button" onClick={() => push(sample)}>
          {sample.title}
        </button>
      ))}
    </div>
  );
}
