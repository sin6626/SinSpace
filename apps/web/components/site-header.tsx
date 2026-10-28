"use client";

import { FilePen, Info, NotebookPen, RefreshCw, Trash2 } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type FocusEvent, type ReactNode } from "react";
import { useIsland, type IslandActivityIcon } from "../lib/island-store";
import ThemeToggle from "./theme-switcher";
import "./site-header.css";

// 页头“夜航岛”：同一个元素在四种状态之间用弹簧变形（Motion 的 layout 动画），像 iPhone 的灵动岛。
// - bar：页面顶部，铺开成整条页头（站点标识 | 星座导航 | 工具），透明；
// - compact：往下滚以后，收拢成正上方一枚深色胶囊，只显示头像和“现在在哪”（在读文章时是标题 + 阅读进度环）；
// - expanded：鼠标移上胶囊、键盘聚焦或导航面板开着时，胶囊展开，导航和工具回到胶囊里；
// - activity：有实时活动（新文章发布、文章修改删除……）时临时变形播报，几秒后缩回去。活动由 lib/island-store.ts 排队。
// 导航（nav）始终渲染、只用 CSS 按状态显隐，避免面板和手机菜单反复卸载。

const spring = { type: "spring", stiffness: 380, damping: 32, mass: 0.9 } as const;
const scrollThreshold = 80;

const sections: [string, string][] = [
  ["/posts", "文章"],
  ["/categories", "文章"],
  ["/notes", "手记"],
  ["/timeline", "时间线"],
  ["/thinking", "碎碎念"],
  ["/projects", "作品"],
  ["/friends", "友链"],
  ["/says", "一言"],
  ["/debug", "调试"],
];
// 读当前地址（usePathname）的部分单独成小组件并包在 Suspense 里：页头本身在预渲染外壳里，
// 直接在页头读地址会让动态路由报 “usePathname() outside of <Suspense>”。
function SectionLabel() {
  return <>{sectionOf(usePathname())}</>;
}

// 换页时调用 onNavigate（松开“钉住”的展开状态）
function NavigateListener({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  useEffect(() => onNavigate(), [pathname, onNavigate]);
  return null;
}

const sectionOf = (pathname: string) => pathname === "/" ? "首页" : sections.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? "页面";

const activityIcons: Record<IslandActivityIcon, ReactNode> = {
  post: <FilePen size={18} strokeWidth={1.75} />,
  note: <NotebookPen size={18} strokeWidth={1.75} />,
  update: <RefreshCw size={18} strokeWidth={1.75} />,
  remove: <Trash2 size={18} strokeWidth={1.75} />,
  info: <Info size={18} strokeWidth={1.75} />,
};

// 阅读进度环：一圈淡轨道，强调色按进度画满
function ProgressRing({ progress }: { progress: number }) {
  const radius = 7;
  const length = 2 * Math.PI * radius;
  return (
    <svg className="island-ring" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <circle cx="9" cy="9" r={radius} className="island-ring-track" />
      <circle cx="9" cy="9" r={radius} className="island-ring-bar" strokeDasharray={length} strokeDashoffset={length * (1 - progress)} />
    </svg>
  );
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > scrollThreshold);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return scrolled;
}

export default function SiteHeader({ brand, nav }: { brand: ReactNode; nav: ReactNode }) {
  const scrolled = useScrolled();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // 触屏没有悬停：点一下收拢的胶囊就“钉住”展开，点别处或换页后松开
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    if (!pinned) return;
    const release = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest(".site-header, .navigation-Positioner")) setPinned(false);
    };
    document.addEventListener("pointerdown", release);
    return () => document.removeEventListener("pointerdown", release);
  }, [pinned]);
  const navOpen = useIsland((state) => state.navOpen);
  const reading = useIsland((state) => state.reading);
  const activity = useIsland((state) => state.activities[0]);
  const shift = useIsland((state) => state.shift);

  // 每条活动播完自动换下一条
  useEffect(() => {
    if (!activity) return;
    const timer = setTimeout(shift, activity.duration);
    return () => clearTimeout(timer);
  }, [activity, shift]);

  const unpin = useCallback(() => setPinned(false), []);
  const mode = activity ? "activity" : !scrolled ? "bar" : hovered || focused || pinned || navOpen ? "expanded" : "compact";
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <header className="site-header" data-mode={mode}>
        <Suspense fallback={null}><NavigateListener onNavigate={unpin} /></Suspense>
        <motion.div
          layout
          transition={spring}
          className="site-header-inner island"
          style={{ borderRadius: mode === "activity" ? 26 : 999 }}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
          onPointerLeave={(event) => { if (event.pointerType === "mouse") setHovered(false); }}
          // 只有键盘聚焦（:focus-visible）才展开：鼠标点过导航链接或主题按钮后焦点会留在页头，
          // 如果也算，往下读文章时岛会一直展开、不收成标题 + 进度环（回归测试 site-header-island.mjs）
          onFocus={(event) => { if ((event.target as Element).matches(":focus-visible")) setFocused(true); }}
          onBlur={onBlur}
        >
          <motion.div layout="position" transition={spring} className="island-brand">
            <Link className="site-brand" href="/" aria-label="回到首页">{brand}</Link>
          </motion.div>

          <motion.div layout="position" transition={spring} className="island-nav">{nav}</motion.div>

          <AnimatePresence initial={false} mode="popLayout">
            {mode === "compact" && (
              <motion.button
                key="context"
                type="button"
                className="island-context"
                onClick={() => setPinned(true)}
                initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                transition={{ duration: 0.2 }}
                aria-label={reading ? `正在读${reading.kind}：${reading.title}，已读 ${Math.round(reading.progress * 100)}%，展开导航` : undefined}
              >
                <span className="island-section">{reading?.kind ?? <Suspense fallback={null}><SectionLabel /></Suspense>}</span>
                {reading && (
                  <>
                    <span className="island-title">{reading.title}</span>
                    <ProgressRing progress={reading.progress} />
                  </>
                )}
              </motion.button>
            )}
            {activity && (
              <motion.div
                key={activity.id}
                className="island-activity"
                role="status"
                initial={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }}
                transition={{ duration: 0.25 }}
              >
                <span className="island-activity-icon" aria-hidden="true">{activityIcons[activity.icon]}</span>
                <span className="island-activity-text">
                  <strong>{activity.title}</strong>
                  {activity.detail && <span>{activity.detail}</span>}
                </span>
                {activity.href && <Link className="island-activity-link" href={activity.href}>去看看</Link>}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div layout="position" transition={spring} className="site-header-tools island-tools">
            <ThemeToggle />
          </motion.div>
        </motion.div>
      </header>
    </MotionConfig>
  );
}
