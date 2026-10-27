"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useSyncExternalStore } from "react";
import "./theme-switcher.css";

// 默认熄灯（深色），这是站点的主场；开灯是浅色，跟随系统由 color-scheme 决定。
type Theme = "light" | "dark" | "system";
const storageKey = "theme";
const options: { value: Theme; label: string }[] = [
  { value: "light", label: "开灯" },
  { value: "dark", label: "熄灯" },
  { value: "system", label: "跟随系统" },
];
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const value = localStorage.getItem(storageKey);
    return value === "light" || value === "system" ? value : "dark";
  } catch {
    return "dark";
  }
}

// 跟随系统时去掉 data-theme，由 globals.css 的 color-scheme: light dark 决定。熄灯是默认值，不写入存储。
function applyToDocument(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

function subscribe(onChange: () => void) {
  // 其他标签页改了主题，这里同步。
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey) return;
    applyToDocument(read());
    onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function choose(theme: Theme) {
  try {
    if (theme === "dark") localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, theme);
  } catch {}
  applyToDocument(theme);
  listeners.forEach((listener) => listener());
}

export default function ThemeSwitcher() {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as const);
  return (
    <ToggleGroup
      className="theme-switcher"
      aria-label="主题"
      value={[theme]}
      // 单选时再点已选中的项会得到空数组，忽略即可。
      onValueChange={([next]) => { if (next) choose(next as Theme); }}
    >
      {options.map(({ value, label }) => (
        <Toggle key={value} value={value} className="theme-switcher-item">{label}</Toggle>
      ))}
    </ToggleGroup>
  );
}
