"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "lucide-react";
import Link, { useLocalePathname } from "./locale-provider";
import { useState, type ReactNode } from "react";
import { OnlineCount } from "./notifications";
import LanguageMenu from "./language-menu";
import ThemeToggle from "./theme-switcher";
import "./mobile-menu.css";

type MenuLink = { label: string; href: string };

// 手机上的导航：顶部只留站名和菜单按钮，点开后整屏变成夜空，四个角落竖排在中间，开灯/熄灯在底部。
export default function MobileMenu({ corners, more, account }: { corners: MenuLink[]; more: MenuLink[]; account?: ReactNode }) {
  const pathname = useLocalePathname();
  const [open, setOpen] = useState(false);
  // 跳转后收起菜单（渲染期比较上一次路径，不用 effect）。
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpen(false);
  }
  const current = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)) ? "page" : undefined;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="mobile-menu-trigger" aria-label="打开菜单">
        <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Popup className="mobile-menu" aria-label="菜单">
          <div className="mobile-menu-top">
            <Dialog.Title className="mobile-menu-title">夜里想去哪儿？</Dialog.Title>
            <Dialog.Close className="btn btn-ghost">关闭</Dialog.Close>
          </div>
          <nav aria-label="主导航">
            <ul className="mobile-menu-corners">
              {corners.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} aria-current={current(link.href)} onClick={() => setOpen(false)}>{link.label}</Link>
                </li>
              ))}
            </ul>
            <ul className="mobile-menu-more">
              {more.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} aria-current={current(link.href)} onClick={() => setOpen(false)}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mobile-menu-bottom">
            {account}
            <LanguageMenu side="top" />
            <ThemeToggle />
            <OnlineCount />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
