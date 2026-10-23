"use client";

import { NavigationMenu } from "@base-ui/react/navigation-menu";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import "./navigation-menu.css";

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
      className="navigation-Root"
      aria-label="主导航"
      orientation={vertical ? "vertical" : "horizontal"}
      closeDelay={500}
    >
      <NavigationMenu.List className="navigation-List">
        <NavigationMenu.Item>
          <NavigationMenu.Link
            className="navigation-Trigger"
            active={pathname === "/"}
            render={<Link href="/" />}
          >首页</NavigationMenu.Link>
        </NavigationMenu.Item>
        {menus.map(({ title, links }) => (
          <NavigationMenu.Item key={title}>
            <NavigationMenu.Trigger className="navigation-Trigger">
              <NavigationMenu.Icon className="navigation-Icon" aria-hidden="true">‹</NavigationMenu.Icon>{title}
            </NavigationMenu.Trigger>
            <NavigationMenu.Content className="navigation-Content">
              <ul className="navigation-FlexLinkList">
                {title === "文章" && (
                  <li><NavigationMenu.Link className="navigation-LinkCard" active={pathname === "/posts"} closeOnClick render={<Link href="/posts" />}><span className="navigation-LinkTitle">全部文章</span></NavigationMenu.Link></li>
                )}
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <NavigationMenu.Link className="navigation-LinkCard" active={pathname === href} closeOnClick render={<Link href={href} prefetch={title === "文章" ? undefined : false} />}>
                      <span className="navigation-LinkTitle">{label}</span>
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
            <button className="navigation-Trigger" type="button" disabled>
              {label}<span className="navigation-status">未开放</span>
            </button>
          </NavigationMenu.Item>
        ))}
        {process.env.NODE_ENV !== "production" && (
          <NavigationMenu.Item>
            <NavigationMenu.Link
              className="navigation-Trigger"
              active={pathname === "/debug"}
              render={<Link href="/debug" />}
            >调试</NavigationMenu.Link>
          </NavigationMenu.Item>
        )}
      </NavigationMenu.List>
      <NavigationMenu.Portal>
        <NavigationMenu.Positioner className="navigation-Positioner" side={vertical ? "left" : "bottom"} align="start" sideOffset={8} collisionPadding={8}>
          <NavigationMenu.Popup className="navigation-Popup">
            <NavigationMenu.Arrow className="navigation-Arrow" />
            <NavigationMenu.Viewport className="navigation-Viewport" />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}
