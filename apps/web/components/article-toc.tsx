"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import "./article-toc.css";

// 文章目录：读取正文里实际渲染出来的标题。
// Lexical 标题的 id 由同版 Haklex 渲染器生成（整篇唯一 slug），Markdown 标题的 id 由 article-body.tsx 生成，
// 直接读 DOM 可以保证锚点与正文一致，不必在这里重复实现两套 slug 规则。
type Entry = { id: string; text: string; level: number };

const headingSelector = ".article-rich :is(h1, h2, h3, h4), .article-body :is(h1, h2, h3, h4)";
// 滚动到距视口顶部这么近时，视为进入该章节。
const activeOffset = 120;

let cached: { key: string; entries: Entry[] } = { key: "", entries: [] };

function headings() {
  const main = document.querySelector("main");
  if (!main) return [];
  // Next 会把上一个页面隐藏保留在 DOM 里，只取当前可见的标题。
  return [...main.querySelectorAll<HTMLHeadingElement>(headingSelector)].filter((heading) => heading.id && heading.checkVisibility());
}

function getEntries() {
  const entries = headings().map((heading) => ({ id: heading.id, text: heading.textContent?.trim() ?? "", level: Number(heading.tagName[1]) }));
  const key = JSON.stringify(entries);
  if (key !== cached.key) cached = { key, entries };
  return cached.entries;
}

// 正文流式渲染、富文本在客户端渲染，内容变化时重新收集标题。
function subscribeContent(onChange: () => void) {
  const main = document.querySelector("main");
  const observer = new MutationObserver(onChange);
  if (main) observer.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ["id", "hidden", "style"] });
  return () => observer.disconnect();
}

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

function getActiveId() {
  const list = headings();
  // 最后几节太短时标题到不了顶部，滚到底就直接算最后一节。
  if (list.length && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) return list.at(-1)!.id;
  let active: string | null = null;
  for (const heading of list) {
    if (heading.getBoundingClientRect().top > activeOffset) break;
    active = heading.id;
  }
  return active;
}

// children 是没有标题时显示的默认右栏内容。
export default function ArticleToc({ children = null }: { children?: ReactNode }) {
  // 服务端拿不到正文 DOM，先不渲染，避免先闪默认内容再变成目录。
  const entries = useSyncExternalStore<Entry[] | null>(subscribeContent, getEntries, () => null);
  const activeId = useSyncExternalStore(subscribeScroll, getActiveId, () => null);
  if (entries === null) return null;
  if (!entries.length) return children;
  const minLevel = Math.min(...entries.map((entry) => entry.level));
  return (
    <nav className="article-toc" aria-labelledby="article-toc-heading">
      <h2 id="article-toc-heading">目录</h2>
      <ol>
        {entries.map((entry) => (
          <li key={entry.id} data-depth={Math.min(entry.level - minLevel, 3)}>
            <a href={`#${encodeURIComponent(entry.id)}`} aria-current={entry.id === activeId ? "location" : undefined}>
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
