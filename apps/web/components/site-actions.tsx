"use client";

import { Popover } from "@base-ui/react/popover";
import { Bell, Heart, Mail, X } from "lucide-react";
import { useRef, useState } from "react";
import SubscribeForm from "./subscribe-form";
import "./site-actions.css";

type Props = { apiUrl: string; siteName: string; likes: number | null; subscribeTypes: ("post_c" | "note_c")[] | null };

// 首屏底部的“喜欢本站”和“订阅”（同 Shiro 首页底部的两个按钮）。
// 喜欢：浏览器直接 POST Core 的 /like_this（按访客 IP 每天一次，经 Next 转发会变成所有人共用服务器 IP），成功后计数就地 +1。
// 订阅：点按钮才浮出订阅表单；后台没开订阅时不显示这个按钮。
export default function SiteActions({ apiUrl, siteName, likes, subscribeTypes }: Props) {
  const [count, setCount] = useState(likes);
  const [liked, setLiked] = useState(false);
  const [message, setMessage] = useState("");
  // 订阅浮层打开时光标直接落在邮箱输入框里；触屏时不聚焦输入框，免得一打开就弹出软键盘挡住浮层
  const emailRef = useRef<HTMLInputElement>(null);

  async function like() {
    if (liked) return;
    try {
      const response = await fetch(`${apiUrl}/like_this`, { method: "POST" });
      if (response.ok) {
        setCount((value) => (value ?? 0) + 1);
        setMessage("谢谢你的喜欢！");
      } else {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        setMessage(body?.message || "今天已经喜欢过啦");
      }
      setLiked(true);
    } catch {
      setMessage("网络有点问题，等会儿再试试");
    }
  }

  return (
    <div className="site-actions">
      <button className="site-action is-like" type="button" onClick={like} aria-pressed={liked}>
        喜欢本站
        <Heart size={16} aria-hidden="true" />
        {count !== null && <span className="site-action-count">{count}</span>}
      </button>
      {subscribeTypes && (
        <Popover.Root>
          <Popover.Trigger className="site-action is-subscribe">
            订阅
            <Bell size={16} aria-hidden="true" />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner className="site-action-positioner" side="top" sideOffset={12}>
              <Popover.Popup className="site-action-popup" initialFocus={(type) => (type === "touch" ? true : emailRef.current)}>
                <div className="subscribe-header">
                  <span className="subscribe-icon" aria-hidden="true">
                    <Mail size={18} strokeWidth={1.75} />
                  </span>
                  <Popover.Title className="subscribe-title">邮件订阅</Popover.Title>
                  <Popover.Close className="subscribe-close" aria-label="关闭">
                    <X size={18} strokeWidth={1.75} aria-hidden="true" />
                  </Popover.Close>
                </div>
                <SubscribeForm apiUrl={apiUrl} types={subscribeTypes} siteName={siteName} emailRef={emailRef} />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}
      <p className="site-action-message" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
