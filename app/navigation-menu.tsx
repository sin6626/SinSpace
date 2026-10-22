"use client";

import { NavigationMenu } from "@base-ui/react/navigation-menu";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

type NavigationLink = { label: string; href: string };
export type NavigationState =
  | { status: "loading" | "error" }
  | { status: "ready"; articles: NavigationLink[]; pages: NavigationLink[] };

const verticalQuery = "(min-width: 640px)";
function subscribe(onChange: () => void) {
  const query = window.matchMedia(verticalQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export default function BlogNavigation({ state }: { state: NavigationState }) {
  const pathname = usePathname();
  const router = useRouter();
  const vertical = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(verticalQuery).matches,
    () => false,
  );
  const menus = [
    { title: "文章", links: state.status === "ready" ? state.articles : [] },
    { title: "关于", links: state.status === "ready" ? state.pages : [] },
  ];

  return (
    <NavigationMenu.Root
      aria-label="主导航"
      orientation={vertical ? "vertical" : "horizontal"}
      closeDelay={500}
    >
      <NavigationMenu.List className="navigation-list">
        <NavigationMenu.Item>
          <NavigationMenu.Link
            className="navigation-item"
            active={pathname === "/"}
            render={<Link href="/" prefetch={false} />}
          >首页</NavigationMenu.Link>
        </NavigationMenu.Item>
        {menus.map(({ title, links }) => (
          <NavigationMenu.Item key={title}>
            <NavigationMenu.Trigger className="navigation-item">
              <span><span className="navigation-caret" aria-hidden="true">‹</span> {title}</span>
            </NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <ul className="navigation-submenu">
                {title === "文章" && (
                  <li><NavigationMenu.Link className="navigation-subitem" closeOnClick render={<Link href="/posts" prefetch={false} />}>全部文章</NavigationMenu.Link></li>
                )}
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <NavigationMenu.Link className="navigation-subitem" active={pathname === href} closeOnClick render={<Link href={href} prefetch={false} />}>
                      {label}
                    </NavigationMenu.Link>
                  </li>
                ))}
                {state.status === "loading" && <li className="navigation-message" role="status">正在读取导航…</li>}
                {state.status === "error" && (
                  <li className="navigation-message" role="status">
                    导航读取失败。<button className="navigation-retry" type="button" onClick={() => router.refresh()}>重试</button>
                  </li>
                )}
                {state.status === "ready" && !links.length && <li className="navigation-message">{title === "文章" ? "暂无分类" : "暂无页面"}</li>}
              </ul>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        ))}
        {["作品", "手记"].map((label) => (
          <NavigationMenu.Item key={label}>
            <button className="navigation-item" type="button" disabled>
              {label}<span className="navigation-status">未开放</span>
            </button>
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>
      <NavigationMenu.Portal>
        <NavigationMenu.Positioner className="navigation-positioner" side={vertical ? "left" : "bottom"} align="start" sideOffset={8} collisionPadding={8}>
          <NavigationMenu.Popup className="navigation-popup">
            <NavigationMenu.Viewport />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}
