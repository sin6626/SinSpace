"use client";

import { NavigationMenu } from "@base-ui/react/navigation-menu";
import { ChevronDown } from "lucide-react";
import { LayoutGroup, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import MobileMenu from "./mobile-menu";
import "./navigation-menu.css";

type NavigationLink = { label: string; href: string };
export type NavigationState =
  | { status: "loading" | "error" }
  | { status: "ready"; articles: NavigationLink[]; pages: NavigationLink[] };

// 一级导航是 space 的四个角落：作品、文章、手记、碎碎念（Core 的速记）。
const corners: NavigationLink[] = [
  { label: "作品", href: "/projects" },
  { label: "文章", href: "/posts" },
  { label: "手记", href: "/notes" },
  { label: "碎碎念", href: "/thinking" },
];

const moreLinks: NavigationLink[] = [
  { label: "时间线", href: "/timeline" },
  { label: "友链", href: "/friends" },
  { label: "一言", href: "/says" },
];

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

// 一级项的内容：文字 + 脚下一颗暗星；当前页那一项再叠一颗亮星（同一个 layoutId，换页时亮星沿着连线移到新的一项）。
function Star({ active }: { active: boolean }) {
  return (
    <>
      <span className="navigation-Dot" aria-hidden="true" />
      {active && (
        <motion.span
          layoutId="navigation-star"
          className="navigation-Star"
          aria-hidden="true"
          transition={{ type: "spring", stiffness: 260, damping: 26, mass: 1 }}
        />
      )}
    </>
  );
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
  // “文章”本身是链接（点击跳转），悬停或聚焦时展开分类子菜单。
  // 后台“页面”（关于我、关于本站）和时间线、友链、一言收在“更多”里。
  const pages = state.status === "ready" ? state.pages : [];
  const articles = state.status === "ready" ? state.articles : [];
  const status = (empty: string, links: NavigationLink[]) => (
    <>
      {state.status === "loading" && <li className="navigation-message" role="status">正在读取导航…</li>}
      {state.status === "error" && (
        <li className="navigation-message" role="status">
          导航读取失败。<button className="navigation-retry" type="button" onClick={() => router.refresh()}>重试</button>
        </li>
      )}
      {state.status === "ready" && !links.length && empty && <li className="navigation-message">{empty}</li>}
    </>
  );
  const subLinks = (links: NavigationLink[]) => links.map(({ label, href }) => (
    <li key={href}>
      <NavigationMenu.Link className="navigation-LinkCard" active={pathname === href} closeOnClick render={<Link href={href} />}>
        <span className="navigation-LinkDot" aria-hidden="true" />
        <span className="navigation-LinkTitle">{label}</span>
      </NavigationMenu.Link>
    </li>
  ));

  const moreCurrent = [...pages, ...moreLinks].some(({ href }) => pathname === href);
  const articlesCurrent = isCurrent(pathname, "/posts") || pathname.startsWith("/categories/");

  const devLinks = process.env.NODE_ENV !== "production" ? [{ label: "调试", href: "/debug" }] : [];

  return (
    <div className="navigation-Area">
    <MobileMenu corners={[{ label: "首页", href: "/" }, ...corners]} more={[...pages, ...moreLinks, ...devLinks]} />
    <NavigationMenu.Root
      className="navigation-Root"
      aria-label="主导航"
      closeDelay={500}
      value={openItem}
      onValueChange={setOpenItem}
    >
      <MotionConfig reducedMotion="user">
      <LayoutGroup id="navigation">
      <NavigationMenu.List className="navigation-List">
        <NavigationMenu.Item>
          <NavigationMenu.Link className="navigation-Trigger" active={pathname === "/"} render={<Link href="/" />}>
            首页<Star active={pathname === "/"} />
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        {corners.map(({ label, href }) => href === "/posts" ? (
          <NavigationMenu.Item key={href} value={label}>
            {/* nativeButton={false}：触发器渲染成链接，回车/点击交给链接跳转，Base UI 负责展开子菜单 */}
            <NavigationMenu.Trigger
              className="navigation-Trigger"
              nativeButton={false}
              render={<Link href={href} />}
              data-current={articlesCurrent ? "" : undefined}
              aria-current={pathname === href ? "page" : undefined}
              onPointerDown={(event) => { lastPointerType.current = event.pointerType; }}
              onClick={(event) => {
                // 触屏没有悬停：子菜单未展开时第一次点按只展开、不跳转；展开后再点才跳转。
                if (lastPointerType.current === "touch" && openItem !== label) event.preventDefault();
              }}
            >
              {label}<Star active={articlesCurrent} />
              <NavigationMenu.Icon className="navigation-Icon" aria-hidden="true"><ChevronDown size={14} /></NavigationMenu.Icon>
            </NavigationMenu.Trigger>
            <NavigationMenu.Content className="navigation-Content">
              <p className="navigation-ContentTitle">分类</p>
              <ul className="navigation-FlexLinkList">
                {subLinks(articles)}
                {status("暂无分类", articles)}
              </ul>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        ) : (
          <NavigationMenu.Item key={href}>
            <NavigationMenu.Link className="navigation-Trigger" active={isCurrent(pathname, href)} render={<Link href={href} />}>
              {label}<Star active={isCurrent(pathname, href)} />
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        ))}
        {/* “更多”没有自己的页面，触发器是普通按钮，点击或悬停只展开子菜单 */}
        <NavigationMenu.Item value="更多">
          <NavigationMenu.Trigger className="navigation-Trigger" data-current={moreCurrent ? "" : undefined}>
            更多<Star active={moreCurrent} />
            <NavigationMenu.Icon className="navigation-Icon" aria-hidden="true"><ChevronDown size={14} /></NavigationMenu.Icon>
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="navigation-Content">
            <p className="navigation-ContentTitle">更多</p>
            <ul className="navigation-FlexLinkList">
              {subLinks(pages)}
              {status("", pages)}
              {subLinks(moreLinks)}
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        {process.env.NODE_ENV !== "production" && (
          <NavigationMenu.Item>
            <NavigationMenu.Link
              className="navigation-Trigger"
              active={pathname === "/debug"}
              render={<Link href="/debug" />}
            >
              调试<Star active={pathname === "/debug"} />
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        )}
      </NavigationMenu.List>
      </LayoutGroup>
      </MotionConfig>
      <NavigationMenu.Portal>
        <NavigationMenu.Positioner className="navigation-Positioner" side="bottom" align="center" sideOffset={12} collisionPadding={12}>
          <NavigationMenu.Popup className="navigation-Popup">
            <NavigationMenu.Viewport className="navigation-Viewport" />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
    </div>
  );
}
