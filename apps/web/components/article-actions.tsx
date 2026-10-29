"use client";

import { ArrowUp, Bell, Heart, MessagesSquare, Share2 } from "lucide-react";
import type { ReactNode } from "react";
import { useIsland } from "../lib/island-store";
import { useArticleLike } from "../lib/use-article-like";
import SubscribePopover from "./subscribe-popover";
import "./article-actions.css";

type Like = { apiUrl: string; id: string; type: "post" | "note"; count: number };

// 文章目录下面的一排操作（参考 Shiro 的 PostActionAside，做了改动）：喜欢、分享、订阅，再加一个 Shiro 没有的“回到顶部”。
// 回到顶部的按钮外面套着阅读进度环（读的是页头夜航岛同一份进度），读得越多画得越满；还在页面顶部时淡出隐藏。
export default function ArticleActions({ title, like, subscribe }: {
  title: string;
  like: Like | null;
  subscribe: { apiUrl: string; siteName: string; types: ("post_c" | "note_c")[]; mailIcon: ReactNode } | null;
}) {
  const progress = useIsland((state) => state.reading?.progress ?? 0);

  return (
    <div className="article-actions" role="group" aria-label="文章操作">
      {like && <LikeButton like={like} />}
      <CommentButton />
      <ShareButton title={title} />
      {subscribe && (
        <SubscribePopover {...subscribe} side="left" triggerClassName="article-action" triggerLabel="订阅更新">
          <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
        </SubscribePopover>
      )}
      <BackToTop progress={progress} />
    </div>
  );
}

function LikeButton({ like }: { like: Like }) {
  const { liked, likes, thumbsUp } = useArticleLike({ apiUrl: like.apiUrl, id: like.id, type: like.type, like: like.count });
  return (
    <button
      type="button"
      className="article-action is-like"
      onClick={thumbsUp}
      aria-pressed={liked}
      aria-label={liked ? `已喜欢，共 ${likes} 人喜欢` : `喜欢这篇，已有 ${likes} 人喜欢`}
      title={liked ? "谢谢你的喜欢" : "喜欢这篇"}
    >
      <Heart size={18} strokeWidth={1.75} aria-hidden="true" />
      {likes > 0 && <span className="article-action-count">{likes}</span>}
    </button>
  );
}

// 读到一半想说两句：平滑滚到文末评论区，并把光标放进评论框（评论关闭时只滚过去）。
// 站内跳转后上一页还藏在 DOM 里，可能有两个 #comments，取看得见的那个。
function CommentButton() {
  function toComments() {
    const section = [...document.querySelectorAll<HTMLElement>("#comments")].find((element) => element.checkVisibility());
    if (!section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    section.querySelector("textarea")?.focus({ preventScroll: true });
  }
  return (
    <button type="button" className="article-action" onClick={toComments} aria-label="去评论" title="去评论">
      <MessagesSquare size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

// 手机等支持系统分享的设备调起分享面板；电脑上复制链接，并在页头夜航岛上播报一下
function ShareButton({ title }: { title: string }) {
  const push = useIsland((state) => state.push);
  async function share() {
    const url = window.location.href.split("#")[0];
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      push({ icon: "link", title: "链接已复制", detail: title, duration: 2600 });
    } catch {
      push({ icon: "info", title: "没能复制链接", detail: "可以直接复制地址栏里的网址", duration: 3200 });
    }
  }
  return (
    <button type="button" className="article-action" onClick={share} aria-label="分享这篇（复制链接）" title="分享">
      <Share2 size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

function BackToTop({ progress }: { progress: number }) {
  const radius = 17;
  const length = 2 * Math.PI * radius;
  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };
  return (
    <button
      type="button"
      className="article-action is-top"
      data-visible={progress > 0.03 ? "" : undefined}
      onClick={toTop}
      aria-label={`回到顶部（已读 ${Math.round(progress * 100)}%）`}
      title="回到顶部"
    >
      <svg className="article-action-ring" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r={radius} className="article-action-ring-track" />
        <circle cx="20" cy="20" r={radius} className="article-action-ring-bar" strokeDasharray={length} strokeDashoffset={length * (1 - progress)} />
      </svg>
      <ArrowUp size={16} strokeWidth={1.9} aria-hidden="true" />
    </button>
  );
}
