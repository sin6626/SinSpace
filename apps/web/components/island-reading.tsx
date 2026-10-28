"use client";

import { useEffect, useRef } from "react";
import { useIsland } from "../lib/island-store";

// 详情页（文章、手记、页面）挂一个：进入时把标题登记到页头夜航岛，滚动时更新阅读进度（0–1，按所在 <article> 算），
// 离开时清掉。站内跳转后上一页被 Activity 藏起来时，React 也会执行这里的清理。
export default function IslandReading({ title, kind }: { title: string; kind: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const { setReading, setProgress } = useIsland.getState();
    setReading({ title, kind, progress: 0 });
    const article = marker.current?.closest("article");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      setProgress(total <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / total)));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (useIsland.getState().reading?.title === title) setReading(null);
    };
  }, [title, kind]);
  return <span ref={marker} hidden />;
}
