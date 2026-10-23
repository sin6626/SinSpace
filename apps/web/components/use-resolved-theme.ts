"use client";

import { useSyncExternalStore } from "react";

// 当前实际生效的明暗主题：手动选择写在 <html data-theme>，否则跟随系统。
// 给需要显式 theme 参数的第三方组件用（如富文本渲染器）。
const darkQuery = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(darkQuery);
  media.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    media.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

function read(): "light" | "dark" {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia(darkQuery).matches ? "dark" : "light";
}

export function useResolvedTheme() {
  return useSyncExternalStore(subscribe, read, () => "light" as const);
}
