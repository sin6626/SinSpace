"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import "./theme-switcher.css";

// 开灯 / 熄灯：一个按钮来回切换，白 → 黑、黑 → 白。默认熄灯（深色），这是站点的主场；开灯存 theme=light。
// 以前的“跟随系统”已去掉，存储里遗留的 system 按熄灯处理。
type Theme = "light" | "dark";
const storageKey = "theme";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    return localStorage.getItem(storageKey) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function subscribe(onChange: () => void) {
  // 其他标签页改了主题，这里同步。
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey) return;
    document.documentElement.dataset.theme = read();
    onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// 整页颜色约 0.6 秒渐变（视图过渡，类型 theme，样式在 globals.css 末尾）；
// 不支持视图过渡或开了“减少动态效果”时直接切换。
function toggle() {
  const next: Theme = read() === "dark" ? "light" : "dark";
  try {
    if (next === "dark") localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, next);
  } catch {}
  const update = () => {
    document.documentElement.dataset.theme = next;
    listeners.forEach((listener) => listener());
  };
  if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) update();
  else document.startViewTransition({ update, types: ["theme"] });
}

export function useTheme() {
  return useSyncExternalStore(subscribe, read, () => "dark" as const);
}

// 图标显示现在的状态，读屏说明点了会怎样。
export default function ThemeToggle() {
  const theme = useTheme();
  return (
    <button type="button" className="icon-button theme-toggle" onClick={toggle} aria-label={theme === "dark" ? "开灯" : "熄灯"}>
      {theme === "dark" ? <Moon size={18} strokeWidth={1.75} aria-hidden="true" /> : <Sun size={18} strokeWidth={1.75} aria-hidden="true" />}
    </button>
  );
}
