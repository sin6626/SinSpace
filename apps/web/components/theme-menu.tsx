"use client";

import { Menu } from "@base-ui/react/menu";
import { themeOptions, useTheme, type Theme } from "./theme-switcher";
import "./theme-menu.css";

// 顶部导航右侧的开灯 / 熄灯：一个图标按钮，点开是三个选项。图标显示当前状态。
const icons: Record<Theme, React.ReactNode> = {
  light: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" /></svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
  ),
};

export default function ThemeMenu() {
  const [theme, choose] = useTheme();
  const current = themeOptions.find((option) => option.value === theme)?.label ?? "熄灯";
  return (
    <Menu.Root>
      <Menu.Trigger className="icon-button" aria-label={`切换明暗，现在是${current}`}>{icons[theme]}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="theme-menu-positioner" sideOffset={8} align="end">
          <Menu.Popup className="theme-menu">
            <Menu.RadioGroup value={theme} onValueChange={(value) => choose(value as Theme)}>
              {themeOptions.map(({ value, label }) => (
                <Menu.RadioItem key={value} value={value} className="theme-menu-item" closeOnClick>
                  {icons[value]}
                  <span>{label}</span>
                  <Menu.RadioItemIndicator className="theme-menu-check">✓</Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
