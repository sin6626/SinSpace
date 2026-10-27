"use client";

import { useSyncExternalStore } from "react";

// 当前实际生效的明暗主题：<html data-theme> 默认是 dark（熄灯），没有该属性时（旧版“跟随系统”遗留）按系统偏好。
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
  return useSyncExternalStore(subscribe, read, () => "dark" as const);
}
