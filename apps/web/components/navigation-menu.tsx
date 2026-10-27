"use client";

import { NavigationMenu } from "@base-ui/react/navigation-menu";
import {
  Bug, ChevronDown, FileText, Hash, HeartHandshake, History, House, MessageCircle, NotebookPen, PenLine, Quote, Shapes,
  type LucideIcon,
} from "lucide-react";
import { LayoutGroup, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
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

// 每一项的图标：一级项只在“当前页”时显示在文字前；子菜单每项都显示。后台页面统一用文档图标。
const icons: Record<string, LucideIcon> = {
  "/": House,
  "/projects": Shapes,
  "/posts": PenLine,
  "/notes": NotebookPen,
  "/thinking": MessageCircle,
  "/timeline": History,
  "/friends": HeartHandshake,
  "/says": Quote,
  "/debug": Bug,
};
const iconOf = (href: string, fallback: LucideIcon = FileText) => {
  const Icon = icons[href] ?? fallback;
  return <Icon size={15} strokeWidth={1.75} aria-hidden="true" />;
};

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
// 弹簧：当前项的底色和图标在换页时滑过去，悬停底色跟着鼠标从一项滑到另一项
const spring = { type: "spring", stiffness: 520, damping: 38, mass: 0.9 } as const;

// 一级项里的内容：当前页有强调色底和图标（同一个 layoutId，换页时从上一项滑过来），文字随之让位。
function Face({ active, icon, label }: { active: boolean; icon: ReactNode; label: string }) {
  return (
    <>
      {active && <motion.span layoutId="navigation-active" className="navigation-Active" transition={spring} />}
      {active && (
        <motion.span layoutId="navigation-active-icon" className="navigation-ItemIcon" transition={spring}>
          {icon}
        </motion.span>
      )}
      <motion.span layout="position" transition={spring}>{label}</motion.span>
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
  const subLinks = (links: NavigationLink[], fallback?: LucideIcon) => links.map(({ label, href }) => (
    <li key={href}>
      <NavigationMenu.Link className="navigation-LinkCard" active={pathname === href} closeOnClick render={<Link href={href} />}>
        <span className="navigation-LinkIcon">{iconOf(href, fallback)}</span>
        <span className="navigation-LinkTitle">{label}</span>
      </NavigationMenu.Link>
    </li>
  ));

  // 悬停底色：整条导航只有一块，量出鼠标所在项的位置和宽度，用弹簧滑过去；离开导航时淡出。
  const [hover, setHover] = useState<{ left: number; width: number } | null>(null);
  const hoverProps = {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse") setHover({ left: event.currentTarget.offsetLeft, width: event.currentTarget.offsetWidth });
    },
  };
  // 跟手的月光：鼠标在胶囊上移动时，一团淡光跟着指针（只改 CSS 变量，不触发渲染）。
  const spotlight = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  };
  // “更多”没有自己的页面；当前页在“更多”里时，直接显示成那一页的名字和图标。
  const moreCurrent = [...pages, ...moreLinks].find(({ href }) => pathname === href);
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
      <NavigationMenu.List className="navigation-List" onPointerMove={spotlight} onPointerLeave={() => setHover(null)}>
        <motion.li
          className="navigation-Hover"
          aria-hidden="true"
          initial={false}
          animate={hover ? { opacity: 1, x: hover.left, width: hover.width } : { opacity: 0 }}
          transition={{ ...spring, opacity: { duration: 0.15 } }}
        />
        <NavigationMenu.Item {...hoverProps}>
          <NavigationMenu.Link className="navigation-Trigger" active={pathname === "/"} render={<Link href="/" />}>
            <Face active={pathname === "/"} icon={iconOf("/")} label="首页" />
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        {corners.map(({ label, href }) => href === "/posts" ? (
          <NavigationMenu.Item key={href} value={label} {...hoverProps}>
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
              <Face active={articlesCurrent} icon={iconOf(href)} label={label} />
              <NavigationMenu.Icon className="navigation-Icon" aria-hidden="true"><ChevronDown size={14} /></NavigationMenu.Icon>
            </NavigationMenu.Trigger>
            <NavigationMenu.Content className="navigation-Content">
              <p className="navigation-ContentTitle">分类</p>
              <ul className="navigation-FlexLinkList">
                {subLinks(articles, Hash)}
                {status("暂无分类", articles)}
              </ul>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        ) : (
          <NavigationMenu.Item key={href} {...hoverProps}>
            <NavigationMenu.Link className="navigation-Trigger" active={isCurrent(pathname, href)} render={<Link href={href} />}>
              <Face active={isCurrent(pathname, href)} icon={iconOf(href)} label={label} />
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        ))}
        {/* “更多”没有自己的页面，触发器是普通按钮，点击或悬停只展开子菜单 */}
        <NavigationMenu.Item value="更多" {...hoverProps}>
          <NavigationMenu.Trigger className="navigation-Trigger" data-current={moreCurrent ? "" : undefined}>
            <Face active={!!moreCurrent} icon={moreCurrent && iconOf(moreCurrent.href)} label={moreCurrent?.label ?? "更多"} />
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
          <NavigationMenu.Item {...hoverProps}>
            <NavigationMenu.Link
              className="navigation-Trigger"
              active={pathname === "/debug"}
              render={<Link href="/debug" />}
            >
              <Face active={pathname === "/debug"} icon={iconOf("/debug")} label="调试" />
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
