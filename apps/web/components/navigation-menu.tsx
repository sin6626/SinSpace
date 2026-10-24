"use client";

import { NavigationMenu } from "@base-ui/react/navigation-menu";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import "./navigation-menu.css";

type NavigationLink = { label: string; href: string };
export type NavigationState =
  | { status: "loading" | "error" }
  | { status: "ready"; articles: NavigationLink[]; pages: NavigationLink[] };

const moreLinks: NavigationLink[] = [
  { label: "时间线", href: "/timeline" },
  { label: "友链", href: "/friends" },
  { label: "一言", href: "/says" },
  { label: "思考", href: "/thinking" },
];

const verticalQuery = "(min-width: 640px)";
function subscribe(onChange: () => void) {
  const query = window.matchMedia(verticalQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export default function BlogNavigation({ state }: { state: NavigationState }) {
  const pathname = usePathname();
  // 当前展开的子菜单。点击一级链接跳转时弹层是“点击打开”的，不会因鼠标离开而关闭，
  // 所以路由变化时主动收起（渲染期间比较上一次路径，不用 effect）。
  const [openItem, setOpenItem] = useState<unknown>(null);
  const [lastPathname, setLastPathname] = useState(pathname);
  const lastPointerType = useRef("");
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpenItem(null);
  }
  const router = useRouter();
  const vertical = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(verticalQuery).matches,
    () => false,
  );
  // 一级项本身就是链接（点击跳转），悬停或聚焦时展开子菜单。
  // Sin 的子菜单是后台“页面”（关于我、关于本站），文章的子菜单是分类。
  const menus = [
    { title: "Sin", href: "/", empty: "暂无页面", links: state.status === "ready" ? state.pages : [] },
    { title: "文章", href: "/posts", empty: "暂无分类", links: state.status === "ready" ? state.articles : [] },
  ];

  return (
    <NavigationMenu.Root
      className="navigation-Root"
      aria-label="主导航"
      orientation={vertical ? "vertical" : "horizontal"}
      closeDelay={500}
      value={openItem}
      onValueChange={setOpenItem}
    >
      <NavigationMenu.List className="navigation-List">
        {menus.map(({ title, href, empty, links }) => (
          <NavigationMenu.Item key={title} value={title}>
            {/* nativeButton={false}：触发器渲染成链接，回车/点击交给链接跳转，Base UI 负责展开子菜单 */}
            <NavigationMenu.Trigger
              className="navigation-Trigger"
              nativeButton={false}
              render={<Link href={href} />}
              aria-current={pathname === href ? "page" : undefined}
              onPointerDown={(event) => { lastPointerType.current = event.pointerType; }}
              onClick={(event) => {
                // 触屏没有悬停：子菜单未展开时第一次点按只展开、不跳转；展开后再点才跳转。
                if (lastPointerType.current === "touch" && openItem !== title) event.preventDefault();
              }}
            >
              <NavigationMenu.Icon className="navigation-Icon" aria-hidden="true">‹</NavigationMenu.Icon>{title}
            </NavigationMenu.Trigger>
            <NavigationMenu.Content className="navigation-Content">
              <ul className="navigation-FlexLinkList">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <NavigationMenu.Link className="navigation-LinkCard" active={pathname === href} closeOnClick render={<Link href={href} />}>
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
                {state.status === "ready" && !links.length && <li className="navigation-message">{empty}</li>}
              </ul>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        ))}
        {[{ label: "作品", href: "/projects" }, { label: "手记", href: "/notes" }].map(({ label, href }) => (
          <NavigationMenu.Item key={href}>
            <NavigationMenu.Link
              className="navigation-Trigger"
              active={pathname === href || pathname.startsWith(`${href}/`)}
              render={<Link href={href} />}
            >{label}</NavigationMenu.Link>
          </NavigationMenu.Item>
        ))}
        {/* “更多”没有自己的页面，触发器是普通按钮，点击或悬停只展开子菜单 */}
        <NavigationMenu.Item value="更多">
          <NavigationMenu.Trigger className="navigation-Trigger">
            <NavigationMenu.Icon className="navigation-Icon" aria-hidden="true">‹</NavigationMenu.Icon>更多
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="navigation-Content">
            <ul className="navigation-FlexLinkList">
              {moreLinks.map(({ label, href }) => (
                <li key={href}>
                  <NavigationMenu.Link className="navigation-LinkCard" active={pathname === href} closeOnClick render={<Link href={href} />}>
                    <span className="navigation-LinkTitle">{label}</span>
                  </NavigationMenu.Link>
                </li>
              ))}
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
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
