"use client";

import { Popover } from "@base-ui/react/popover";
import { MessagesSquare, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import CommentForm, { type CommentRefType } from "./comment-form";
import type { FormOptions } from "./comments";

type ReplyTarget = { id: string; author: string };

// 评论悬浮窗外壳：侧栏的评论按钮 + 浮在它左边的聊天窗（消息流由服务端渲染后作为 children 传进来）。
// 不滚动页面，读者读到哪儿还在哪儿；点文章、滚动页面都不会关掉它（只有 Esc、× 或再点按钮），方便边读边聊。
// 打开时滚到最新一条，光标放进输入框；点某条的“回复”，输入框上方出现“回复 @某人”，被回复的那条亮起。
export default function CommentChatPanel({ title, total, form, closedReason, target, children }: {
  title: string;
  total: number;
  form: FormOptions;
  closedReason: string | null;
  target: { refId: string; refType: CommentRefType };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLDivElement>(null);
  const textarea = () => composer.current?.querySelector("textarea") ?? null;

  // 滚到最新一条：打开动画结束时（刚挂载时浮层高度还没定）和发出新评论刷新后
  const toLatest = () => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  };
  useLayoutEffect(toLatest, [children]);

  // 被回复的那条消息亮起；换了回复对象就把光标送回输入框
  useEffect(() => {
    const stream = scroller.current;
    if (!stream || !replyTo) return;
    const message = stream.querySelector<HTMLElement>(`.chat-message[data-id="${CSS.escape(replyTo.id)}"]`);
    message?.setAttribute("data-replying", "");
    textarea()?.focus();
    return () => message?.removeAttribute("data-replying");
  }, [replyTo]);

  function pickReply(event: MouseEvent<HTMLDivElement>) {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-reply-id]");
    if (button) setReplyTo({ id: button.dataset.replyId!, author: button.dataset.replyAuthor ?? "" });
  }

  return (
    <Popover.Root
      open={open}
      modal={false}
      onOpenChangeComplete={(next) => next && toLatest()}
      onOpenChange={(next, details) => {
        if (!next && (details.reason === "outside-press" || details.reason === "focus-out")) return details.cancel();
        setOpen(next);
        if (!next) setReplyTo(null);
      }}
    >
      <Popover.Trigger className="article-action" aria-label={total ? `评论（${total} 条）` : "评论"} title="边读边聊">
        <MessagesSquare size={18} strokeWidth={1.75} aria-hidden="true" />
        {total > 0 && <span className="article-action-count">{total}</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="chat-positioner" side="left" align="end" sideOffset={16} collisionPadding={16}>
          <Popover.Popup className="chat-popup" initialFocus={(type) => (type === "touch" ? true : textarea() ?? true)}>
            <header className="chat-header">
              <div className="chat-heading">
                <Popover.Title className="chat-title">边读边聊{total > 0 && <span>{total}</span>}</Popover.Title>
                <Popover.Description className="chat-subtitle">{title}</Popover.Description>
              </div>
              <Popover.Close className="chat-close" aria-label="关闭评论">
                <X size={18} strokeWidth={1.75} aria-hidden="true" />
              </Popover.Close>
            </header>
            <div className="chat-scroller" ref={scroller} onClick={pickReply}>{children}</div>
            <div className="chat-composer" ref={composer}>
              {closedReason ? (
                <p className="chat-closed">{closedReason}</p>
              ) : (
                <>
                  {replyTo && (
                    <p className="chat-replying">
                      <span>回复 <strong>@{replyTo.author}</strong></span>
                      <button type="button" onClick={() => setReplyTo(null)} aria-label="取消回复"><X size={14} strokeWidth={2} aria-hidden="true" /></button>
                    </p>
                  )}
                  <CommentForm key={replyTo?.id ?? "new"} {...form} variant="chat" onDone={() => setReplyTo(null)} {...(replyTo ? { replyTo } : target)} />
                </>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
