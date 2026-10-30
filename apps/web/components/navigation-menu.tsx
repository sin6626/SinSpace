"use client";

import { NavigationMenu } from "@base-ui/react/navigation-menu";
import { ArrowRight, ChevronDown } from "lucide-react";
import { LayoutGroup, MotionConfig, motion } from "motion/react";
import Link, { useLocalePathname } from "./locale-provider";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useIsland } from "../lib/island-store";
import type { NavigationEntry, getNavigationPanels } from "../lib/blog-data";
import { formatDate } from "../lib/date";
import MobileMenu from "./mobile-menu";
import "./navigation-menu.css";

type NavigationLink = { label: string; href: string };
type Panels = Awaited<ReturnType<typeof getNavigationPanels>>;
export type NavigationState =
  | { status: "loading" | "error" }
  | {
    status: "ready";
    pages: NavigationLink[];
    panels: Panels | null;
    socials: { label: string; href: string; icon: ReactNode }[];
  };

// 一级导航的顺序：首页、文章、手记、时间线、碎碎念、更多（作品、友链、一言、思考），开发环境末尾再加“调试”。
// 首页、文章、手记、时间线本身是链接（点击跳转），悬停或聚焦时展开各自的面板；碎碎念只是链接；更多只展开。
const moreLinks = [
  { label: "作品", href: "/projects", note: "开源项目与作品集" },
  { label: "友链", href: "/friends", note: "互联网上的朋友们" },
  { label: "一言", href: "/says", note: "言语的碎片" },
  { label: "思考", href: "/thinking", note: "读到的、看到的和我的看法" },
];

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
// 面板里的日期只显示“月·日”
const monthDay = (created: string) => formatDate(created).slice(5).replace("/", "·");
// 全站字数：一万以上写成“7.3 万字”
const wordCount = (words: number) => (words >= 10000 ? { value: (words / 10000).toFixed(1), unit: "万字" } : { value: String(words), unit: "字" });

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

// 面板里的链接：点了就收起面板，交给 Next 的 Link 跳转
function PanelLink({ href, className, children, current }: { href: string; className: string; children: ReactNode; current?: boolean }) {
  return (
    <NavigationMenu.Link className={className} active={current} closeOnClick render={<Link href={href} />}>
      {children}
    </NavigationMenu.Link>
  );
}

// 一条条“月·日 标题 [类型]”的近期列表
function EntryList({ entries, pathname, showKind }: { entries: NavigationEntry[]; pathname: string; showKind?: boolean }) {
  if (!entries.length) return <p className="nav-panel-empty">还没有内容</p>;
  return (
    <ul className="nav-entries">
      {entries.map((entry) => (
        <li key={entry.id}>
          <PanelLink href={entry.href} className="nav-entry" current={pathname === entry.href}>
            <time dateTime={entry.created}>{monthDay(entry.created)}</time>
            <span className="nav-entry-title">{entry.title}</span>
            {showKind && <span className="nav-entry-kind">{entry.kind === "post" ? "文章" : "手记"}</span>}
          </PanelLink>
        </li>
      ))}
    </ul>
  );
}

function PanelFooter({ href, label, aside }: { href: string; label: string; aside?: ReactNode }) {
  return (
    <div className="nav-panel-footer">
      <PanelLink href={href} className="nav-panel-more">{label}<ArrowRight size={14} aria-hidden="true" /></PanelLink>
      {aside && <span>{aside}</span>}
    </div>
  );
}

// 首页面板：左边“此间”（全站篇数、字数、建站天数和社交账号），右边后台页面
function HomePanel({ state, pathname }: { state: Extract<NavigationState, { status: "ready" }>; pathname: string }) {
  const stats = state.panels?.stats;
  const words = stats && wordCount(stats.words);
  return (
    <div className="nav-panel is-home">
      {stats && (
        <section className="nav-panel-side">
          <p className="nav-panel-label">此间</p>
          <dl className="nav-stats">
            <div><dt>篇文字</dt><dd>{stats.writings}</dd></div>
            {words && <div><dt>{words.unit}</dt><dd>{words.value}</dd></div>}
            {stats.days && <div><dt>日</dt><dd>{stats.days}</dd></div>}
          </dl>
          {state.socials.length > 0 && (
            <ul className="nav-socials">
              {state.socials.map((social) => (
                <li key={social.href}>
                  <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={social.label}>{social.icon}</a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <section className="nav-panel-main">
        <p className="nav-panel-label">页面</p>
        {state.pages.length ? (
          <ul className="nav-page-grid">
            {state.pages.map((page) => (
              <li key={page.href}>
                <PanelLink href={page.href} className="nav-link" current={pathname === page.href}>{page.label}</PanelLink>
              </li>
            ))}
          </ul>
        ) : <p className="nav-panel-empty">还没有页面</p>}
      </section>
    </div>
  );
}

// 分组面板（文章按分类、手记按话题）：左边各组和篇数，鼠标停在哪一组，右边就列出它最近的 5 篇；底部“查看全部”。
// showKind：右边列表每条后面标出“文章 / 手记”（时间线的“全部”是混排的）
type Group = { name: string; href: string; count: number; icon?: string; recent: NavigationEntry[]; showKind?: boolean };

function GroupPanel({ className, label, groups, fallback, pathname, footer }: {
  className: string;
  label: string;
  groups: Group[];
  fallback: NavigationEntry[];
  pathname: string;
  footer: ReactNode;
}) {
  const [active, setActive] = useState(() => Math.max(0, groups.findIndex((group) => group.recent.length)));
  const group = groups[active];
  return (
    <div className={`nav-panel ${className}`}>
      <div className="nav-panel-body">
        {groups.length > 0 && (
          <section className="nav-panel-side">
            <p className="nav-panel-label">{label}</p>
            <ul className="nav-categories">
              {groups.map((item, index) => (
                <li key={item.href} data-highlighted={index === active ? "" : undefined} onPointerEnter={() => setActive(index)} onFocus={() => setActive(index)}>
                  <PanelLink href={item.href} className="nav-category" current={pathname === item.href}>
                    <span className="nav-category-name">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 话题图标来自后台任意地址 */}
                      {item.icon !== undefined && (item.icon ? <img className="nav-topic-icon" src={item.icon} alt="" width={18} height={18} /> : <span className="nav-topic-icon" aria-hidden="true" />)}
                      {item.name}
                    </span>
                    <span className="nav-category-count">{item.count}</span>
                  </PanelLink>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="nav-panel-main">
          <p className="nav-panel-label">{group ? `${group.name} · 最近` : "最近"}</p>
          <EntryList entries={group?.recent ?? fallback} pathname={pathname} showKind={group?.showKind} />
        </section>
      </div>
      {footer}
    </div>
  );
}

// account：手机菜单底部的读者登录入口（header-account.tsx）
export default function BlogNavigation({ state, account }: { state: NavigationState; account?: ReactNode }) {
  // 去掉语言前缀后的路径，判断当前页用（/en/posts 也算“文章”）
  const pathname = useLocalePathname();
  // 当前展开的面板。点击一级链接跳转时弹层是“点击打开”的，不会因鼠标离开而关闭，
  // 所以路由变化时主动收起（渲染期间比较上一次路径，不用 effect）。
  const [openItem, setOpenItem] = useState<unknown>(null);
  const [lastPathname, setLastPathname] = useState(pathname);
  const lastPointerType = useRef("");
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpenItem(null);
  }
  // 面板开着时告诉页头夜航岛别收起（否则面板会失去依附）
  const setNavOpen = useIsland((store) => store.setNavOpen);
  useEffect(() => setNavOpen(openItem !== null), [openItem, setNavOpen]);
  const router = useRouter();
  const ready = state.status === "ready" ? state : null;
  const panels = ready?.panels ?? null;
  const pages = ready?.pages ?? [];
  const devLinks = process.env.NODE_ENV !== "production" ? [{ label: "调试", href: "/debug" }] : [];

  // 本身是链接、悬停展开面板的一级项。nativeButton={false}：触发器渲染成链接，回车/点击交给链接跳转，Base UI 负责展开面板。
  // 触屏没有悬停：面板未展开时第一次点按只展开、不跳转；展开后再点才跳转。
  const linkItem = (label: string, href: string, current: boolean, panel: ReactNode | null) => panel ? (
    <NavigationMenu.Item key={href} value={label}>
      <NavigationMenu.Trigger
        className="navigation-Trigger"
        nativeButton={false}
        render={<Link href={href} />}
        data-current={current ? "" : undefined}
        aria-current={pathname === href ? "page" : undefined}
        onPointerDown={(event) => { lastPointerType.current = event.pointerType; }}
        onClick={(event) => {
          if (lastPointerType.current === "touch" && openItem !== label) event.preventDefault();
        }}
      >
        {label}<Star active={current} />
        <NavigationMenu.Icon className="navigation-Icon" aria-hidden="true"><ChevronDown size={14} /></NavigationMenu.Icon>
      </NavigationMenu.Trigger>
      <NavigationMenu.Content className="navigation-Content">{panel}</NavigationMenu.Content>
    </NavigationMenu.Item>
  ) : (
    <NavigationMenu.Item key={href}>
      <NavigationMenu.Link className="navigation-Trigger" active={current} render={<Link href={href} />}>
        {label}<Star active={current} />
      </NavigationMenu.Link>
    </NavigationMenu.Item>
  );

  const moreCurrent = moreLinks.some(({ href }) => isCurrent(pathname, href));

  return (
    <div className="navigation-Area">
    <MobileMenu
      corners={[{ label: "首页", href: "/" }, { label: "文章", href: "/posts" }, { label: "手记", href: "/notes" }, { label: "时间线", href: "/timeline" }, { label: "碎碎念", href: "/murmurs" }]}
      more={[...pages, ...moreLinks, ...devLinks]}
      account={account}
    />
    <NavigationMenu.Root
      className="navigation-Root"
      aria-label="主导航"
      // 鼠标离开后多久收起面板：原来 500ms 用着粘手，150ms 足够鼠标从导航滑进面板（中间有透明的悬停桥）
      closeDelay={150}
      value={openItem}
      onValueChange={setOpenItem}
    >
      <MotionConfig reducedMotion="user">
      <LayoutGroup id="navigation">
      <NavigationMenu.List className="navigation-List">
        {linkItem("首页", "/", pathname === "/", ready && <HomePanel state={ready} pathname={pathname} />)}
        {linkItem("文章", "/posts", isCurrent(pathname, "/posts") || pathname.startsWith("/categories/"), panels && (
          <GroupPanel className="is-posts" label="分类" groups={panels.categories} fallback={[]} pathname={pathname}
            footer={<PanelFooter href="/posts" label="查看全部文章" aside={`${panels.postCount} 篇文章`} />} />
        ))}
        {linkItem("手记", "/notes", isCurrent(pathname, "/notes"), panels && (
          <GroupPanel className="is-notes" label="话题" groups={panels.topics.map((topic) => ({ ...topic, icon: topic.icon ?? "" }))} fallback={panels.recentNotes} pathname={pathname}
            footer={<PanelFooter href="/notes" label="查看全部手记" aside={`${panels.noteCount} 篇手记`} />} />
        ))}
        {/* 时间线面板：全部 / 文章 / 手记三组，点组名进时间线对应的子页，鼠标停在哪组右边就列出它最近的 5 篇 */}
        {linkItem("时间线", "/timeline", isCurrent(pathname, "/timeline"), panels && (
          <GroupPanel
            className="is-timeline"
            label="分类"
            groups={[
              { name: "全部", href: "/timeline", count: panels.postCount + panels.noteCount, recent: panels.recent, showKind: true },
              { name: "文章", href: "/timeline/posts", count: panels.postCount, recent: panels.recentPosts },
              { name: "手记", href: "/timeline/notes", count: panels.noteCount, recent: panels.recentNotes },
            ]}
            fallback={panels.recent}
            pathname={pathname}
            footer={<PanelFooter href="/timeline" label="查看时间线" />}
          />
        ))}
        {linkItem("碎碎念", "/murmurs", isCurrent(pathname, "/murmurs"), null)}
        {/* “更多”没有自己的页面，触发器是普通按钮，点击或悬停只展开面板 */}
        <NavigationMenu.Item value="更多">
          <NavigationMenu.Trigger className="navigation-Trigger" data-current={moreCurrent ? "" : undefined}>
            更多<Star active={moreCurrent} />
            <NavigationMenu.Icon className="navigation-Icon" aria-hidden="true"><ChevronDown size={14} /></NavigationMenu.Icon>
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="navigation-Content">
            <div className="nav-panel is-more">
              <ul className="nav-more">
                {moreLinks.map((link) => (
                  <li key={link.href}>
                    <PanelLink href={link.href} className="nav-more-link" current={isCurrent(pathname, link.href)}>
                      <span className="nav-more-name">{link.label}</span>
                      <span className="nav-more-leader" aria-hidden="true" />
                      <span className="nav-more-note">{link.note}</span>
                    </PanelLink>
                  </li>
                ))}
              </ul>
              {state.status === "loading" && <p className="navigation-message" role="status">正在读取导航…</p>}
              {state.status === "error" && (
                <p className="navigation-message" role="status">
                  导航读取失败。<button className="navigation-retry" type="button" onClick={() => router.refresh()}>重试</button>
                </p>
              )}
            </div>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        {devLinks.map((link) => linkItem(link.label, link.href, pathname === link.href, null))}
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
