"use client";

import { useEffect, useRef, type ReactNode } from "react";

// 首页场景的外框：滚出视野时给动画打上暂停标记，省电；回到视野再继续。
export default function BalconyMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      element.toggleAttribute("data-paused", !entry.isIntersecting);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <section ref={ref} className="balcony" aria-label="熄灯后的阳台">{children}</section>;
}
