"use client";

import { useEffect, useRef } from "react";
import { useIsland, type IslandReadingKind } from "../lib/island-store";

// 详情页（文章、手记、页面）挂一个：进入时把标题登记到页头夜航岛，滚动时更新阅读进度（0–1，按所在 <article> 算），
// 离开时清掉。站内跳转后上一页被 Activity 藏起来时，React 也会执行这里的清理。
// date：已经格式化好的发布日期，显示在胶囊里标题后面（页面没有日期时不传）
export default function IslandReading({ title, kind, date }: { title: string; kind: IslandReadingKind; date?: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const { setReading, setProgress } = useIsland.getState();
    setReading({ title, kind, date, progress: 0 });
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
  }, [title, kind, date]);
  return <span ref={marker} hidden />;
}
