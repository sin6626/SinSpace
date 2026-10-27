"use client";

import { Popover } from "@base-ui/react/popover";
import { useState } from "react";
import SubscribeForm from "./subscribe-form";
import "./site-actions.css";

type Props = { apiUrl: string; likes: number | null; subscribeTypes: ("post_c" | "note_c")[] | null };

// 首屏底部的“喜欢本站”和“订阅”（同 Shiro 首页底部的两个按钮）。
// 喜欢：浏览器直接 POST Core 的 /like_this（按访客 IP 每天一次，经 Next 转发会变成所有人共用服务器 IP），成功后计数就地 +1。
// 订阅：点按钮才浮出订阅表单；后台没开订阅时不显示这个按钮。
export default function SiteActions({ apiUrl, likes, subscribeTypes }: Props) {
  const [count, setCount] = useState(likes);
  const [liked, setLiked] = useState(false);
  const [message, setMessage] = useState("");

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
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>
        {count !== null && <span className="site-action-count">{count}</span>}
      </button>
      {subscribeTypes && (
        <Popover.Root>
          <Popover.Trigger className="site-action is-subscribe">
            订阅
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" /></svg>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner className="site-action-positioner" side="top" sideOffset={12}>
              <Popover.Popup className="site-action-popup">
                <SubscribeForm apiUrl={apiUrl} types={subscribeTypes} />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}
      <p className="site-action-message" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
