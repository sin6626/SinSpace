"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { themeOptions, useTheme, type Theme } from "./theme-switcher";
import "./theme-menu.css";

// 顶部导航右侧的开灯 / 熄灯：一个图标按钮，点开是三个选项。图标显示当前状态。
const icons: Record<Theme, React.ReactNode> = {
  light: <Sun size={18} strokeWidth={1.75} aria-hidden="true" />,
  dark: <Moon size={18} strokeWidth={1.75} aria-hidden="true" />,
  system: <Monitor size={18} strokeWidth={1.75} aria-hidden="true" />,
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
                  <Menu.RadioItemIndicator className="theme-menu-check"><Check size={14} aria-hidden="true" /></Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
