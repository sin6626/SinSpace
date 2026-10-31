"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu, Search } from "lucide-react";
import Link, { useLocalePathname, useT } from "./locale-provider";
import { useState, type ReactNode } from "react";
import { OnlineCount } from "./notifications";
import LanguageMenu from "./language-menu";
import ThemeToggle from "./theme-switcher";
import { openSearch } from "./command-search";
import "./mobile-menu.css";

type MenuLink = { label: string; href: string };

// 手机上的导航：顶部只留站名和菜单按钮，点开后整屏变成夜空，四个角落竖排在中间，开灯/熄灯在底部。
export default function MobileMenu({ corners, more, account }: { corners: MenuLink[]; more: MenuLink[]; account?: ReactNode }) {
  const pathname = useLocalePathname();
  const t = useT().mobileMenu;
  const nav = useT().nav;
  const search = useT().search;
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
      <Dialog.Trigger className="mobile-menu-trigger" aria-label={t.open}>
        <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Popup className="mobile-menu" aria-label={t.label}>
          <div className="mobile-menu-top">
            <Dialog.Title className="mobile-menu-title">{t.title}</Dialog.Title>
            <Dialog.Close className="btn btn-ghost">{t.close}</Dialog.Close>
          </div>
          <nav aria-label={nav.label}>
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
            {/* 手机上页头没有工具区，搜索从这里打开：先收起菜单，再弹出同一个搜索弹窗 */}
            <button type="button" className="icon-button" onClick={() => { setOpen(false); openSearch(); }} aria-label={search.open}>
              <Search size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
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
