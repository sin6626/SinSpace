"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ArrowRight, CornerDownLeft, Search, SunMoon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { create } from "zustand";
import { localizeHref } from "../lib/i18n/config";
import { formatDate } from "../lib/date";
import { quickSearch, type SearchResult } from "./command-search-action";
import Link, { useLocale, useT } from "./locale-provider";
import { toggleTheme } from "./theme-switcher";
import "./command-search.css";

type QuickLink = { label: string; href: string; note?: string };
// meta：文章的分类（小胶囊）；note：常去地方的一句说明（淡色小字）
type Item = { key: string; label: ReactNode; href?: string; meta?: string; note?: string; date?: string; run?: () => void; more?: boolean };
type Group = { label: string; items: Item[] };

// 全站只有一个搜索弹窗（页头那份挂载），快捷键、页头放大镜、调试页按钮都打开同一个
const useSearchDialog = create<{ open: boolean; setOpen: (open: boolean) => void }>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
export const openSearch = () => useSearchDialog.getState().setOpen(true);

// 快捷键的写法跟着系统走：Mac 是 ⌘K，其他是 Ctrl K。服务端不知道系统，先不显示
const noop = () => () => {};
const useShortcutLabel = () => useSyncExternalStore(noop, () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K"), () => "");

// 标题里命中的词用月光色标出来（按空格分开的每个词都标）
function highlight(text: string, keyword: string) {
  const terms = keyword.split(/\s+/).filter(Boolean).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!terms.length) return text;
  return text.split(new RegExp(`(${terms.join("|")})`, "gi")).map((part, index) => (index % 2 ? <mark key={index}>{part}</mark> : part));
}

// ⌘K / Ctrl+K 搜索：空着时列出常去的地方和“切换主题”，输入后文章、手记一起搜（停顿 180 毫秒再搜，旧结果先留着不闪）。
// 键盘：↑↓ 选、回车打开、Esc 关；鼠标移到哪条就选中哪条。结果多于一页时最后一条是“查看全部”，去列表页的搜索结果。
export default function CommandSearch({ links }: { links: QuickLink[] }) {
  const t = useT().search;
  const locale = useLocale();
  const router = useRouter();
  const { open, setOpen } = useSearchDialog();
  const keys = useShortcutLabel();
  const [query, setQuery] = useState("");
  const [done, setDone] = useState<{ keyword: string; result: SearchResult | null } | null>(null);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const keyword = query.trim();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      event.preventDefault();
      useSearchDialog.getState().setOpen(!useSearchDialog.getState().open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!keyword) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const result = await quickSearch(keyword, locale);
      if (stale) return;
      setDone({ keyword, result });
      setActive(0);
    }, 180);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [keyword, locale]);

  const close = () => setOpen(false);
  const searching = Boolean(keyword) && done?.keyword !== keyword;
  const result = keyword ? done?.result : undefined;
  const shownKeyword = done?.keyword ?? keyword;

  const groups: Group[] = !keyword
    ? [
      { label: t.goTo, items: links.map((link) => ({ key: link.href, label: link.label, href: link.href, note: link.note })) },
      { label: t.actions, items: [{ key: "theme", label: t.toggleTheme, run: toggleTheme }] },
    ]
    : result
      ? [
        {
          label: t.posts,
          items: [
            ...result.posts.map((hit) => ({ key: hit.id, label: highlight(hit.title, shownKeyword), href: hit.href, meta: hit.meta, date: hit.created })),
            ...(result.postTotal > result.posts.length ? [{ key: "posts-more", label: t.more(result.postTotal), href: `/posts?q=${encodeURIComponent(shownKeyword)}`, more: true }] : []),
          ],
        },
        {
          label: t.notes,
          items: [
            ...result.notes.map((hit) => ({ key: hit.id, label: highlight(hit.title, shownKeyword), href: hit.href, date: hit.created })),
            ...(result.noteTotal > result.notes.length ? [{ key: "notes-more", label: t.more(result.noteTotal), href: `/notes?q=${encodeURIComponent(shownKeyword)}`, more: true }] : []),
          ],
        },
      ].filter((group) => group.items.length)
      : [];
  const items = groups.flatMap((group) => group.items);
  const current = Math.min(active, Math.max(0, items.length - 1));
  const optionId = (index: number) => `${listId}-${index}`;

  useEffect(() => {
    if (open) document.getElementById(optionId(current))?.scrollIntoView({ block: "nearest" });
  });

  const choose = (item: Item | undefined) => {
    if (!item) return;
    close();
    if (item.run) item.run();
    else if (item.href) router.push(localizeHref(item.href, locale));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length) setActive((current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      choose(items[current]);
    }
  };

  let index = -1;
  const status = !keyword ? null
    : searching && !result ? <p className="search-status" role="status">{t.searching}</p>
    : result === null ? <p className="search-status" role="alert">{t.failed}</p>
    : result && !items.length ? <p className="search-status" role="status">{t.empty(shownKeyword)}</p>
    : null;

  return (
    <>
      <button
        type="button"
        className="icon-button search-trigger"
        onClick={openSearch}
        aria-label={t.open}
        aria-keyshortcuts="Meta+K Control+K"
        title={keys ? t.shortcut(keys) : t.open}
      >
        <Search size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <Dialog.Root
        open={open}
        onOpenChange={setOpen}
        onOpenChangeComplete={(isOpen) => {
          if (isOpen) return;
          setQuery("");
          setDone(null);
          setActive(0);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="search-backdrop" />
          <Dialog.Popup className="search-dialog" initialFocus={input} aria-busy={searching}>
            <Dialog.Title className="sr-only">{t.label}</Dialog.Title>
            <div className="search-field">
              <Search size={18} strokeWidth={1.75} aria-hidden="true" />
              <input
                ref={input}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={t.placeholder}
                aria-label={t.label}
                role="combobox"
                aria-expanded={items.length > 0}
                aria-controls={listId}
                aria-activedescendant={items.length ? optionId(current) : undefined}
                aria-autocomplete="list"
                autoComplete="off"
                spellCheck={false}
                maxLength={100}
              />
              {searching && <span className="search-spinner" aria-hidden="true" />}
              <Dialog.Close className="search-esc" aria-label={t.close}>esc</Dialog.Close>
            </div>
            <div className="search-body" data-stale={searching && result ? "" : undefined}>
              {status}
              <div id={listId} role="listbox" aria-label={t.label}>
                {groups.map((group) => (
                  <div key={group.label} role="group" aria-label={group.label} className="search-group">
                    <p className="search-group-label" aria-hidden="true">{group.label}</p>
                    {group.items.map((item) => {
                      index += 1;
                      const own = index;
                      const content = (
                        <>
                          <span className="search-star" aria-hidden="true" />
                          <span className="search-item-label">{item.label}</span>
                          {item.note && <span className="search-item-note">{item.note}</span>}
                          {item.meta && <span className="search-item-meta">{item.meta}</span>}
                          {item.date && <time className="search-item-date" dateTime={item.date}>{formatDate(item.date).replaceAll("/", ".")}</time>}
                          {item.more ? <ArrowRight size={14} aria-hidden="true" /> : item.run ? <SunMoon size={14} aria-hidden="true" /> : null}
                        </>
                      );
                      const props = {
                        id: optionId(own),
                        role: "option",
                        "aria-selected": own === current,
                        className: "search-item",
                        "data-more": item.more ? "" : undefined,
                        tabIndex: -1,
                        onMouseMove: () => own !== current && setActive(own),
                      };
                      return item.href ? (
                        <Link key={item.key} href={item.href} {...props} onClick={close}>{content}</Link>
                      ) : (
                        <button key={item.key} type="button" {...props} onClick={() => choose(item)}>{content}</button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <footer className="search-footer" aria-hidden="true">
              <span><kbd>↑</kbd><kbd>↓</kbd>{t.hintMove}</span>
              <span><kbd><CornerDownLeft size={11} /></kbd>{t.hintOpen}</span>
              <span><kbd>esc</kbd>{t.hintClose}</span>
              {keys && <span className="search-footer-keys"><kbd>{keys}</kbd></span>}
            </footer>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

// 调试页等处打开同一个搜索弹窗
export function OpenSearchButton({ children }: { children: ReactNode }) {
  return <button type="button" className="btn" onClick={openSearch}>{children}</button>;
}
