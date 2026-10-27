"use client";

import type { ReactNode } from "react";

// 首屏底部的“往下看看”：点击后平滑滚到目标位置（开了“减少动态效果”时直接跳），
// 不用全局 scroll-behavior: smooth，免得影响路由切换时的滚动。没有 JS 时退回普通锚点跳转。
export default function ScrollHint({ target, className, children }: { target: string; className?: string; children: ReactNode }) {
  return (
    <a
      className={className}
      href={`#${target}`}
      onClick={(event) => {
        const element = document.getElementById(target);
        if (!element) return;
        event.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }}
    >
      {children}
    </a>
  );
}
