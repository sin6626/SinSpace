"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useSyncExternalStore } from "react";
import "@/components/theme-switcher.css";

// 设计系统对照用的临时切换器：选定配色后连同 globals.css 里的方案块、layout 的 palette 脚本一起删掉。
const storageKey = "palette";
const options = [
  { value: "ink", label: "墨" },
  { value: "night", label: "夜空" },
];
const listeners = new Set<() => void>();

function read() {
  return document.documentElement.dataset.palette ?? "ink";
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

function choose(palette: string) {
  if (palette === "ink") {
    delete document.documentElement.dataset.palette;
    localStorage.removeItem(storageKey);
  } else {
    document.documentElement.dataset.palette = palette;
    localStorage.setItem(storageKey, palette);
  }
  listeners.forEach((listener) => listener());
}

export default function PaletteSwitcher() {
  const palette = useSyncExternalStore(subscribe, read, () => "ink");
  return (
    <ToggleGroup className="theme-switcher" aria-label="配色方案" value={[palette]} onValueChange={([next]) => { if (next) choose(next); }}>
      {options.map(({ value, label }) => (
        <Toggle key={value} value={value} className="theme-switcher-item">{label}</Toggle>
      ))}
    </ToggleGroup>
  );
}
