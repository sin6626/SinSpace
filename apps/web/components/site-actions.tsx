"use client";

import { Popover } from "@base-ui/react/popover";
import { Bell, Heart, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import SubscribeForm from "./subscribe-form";
import "./site-actions.css";

type Props = { apiUrl: string; siteName: string; likes: number | null; subscribeTypes: ("post_c" | "note_c")[] | null; mailIcon: ReactNode };
type FloatingHeart = { id: number; x: number; rise: number; rotate: number; size: number; delay: number };

const likedKey = "site-liked-on";
const today = () => new Date().toLocaleDateString("sv");

// 一次点击飘出一串大小、方向、快慢都不同的爱心；第二次以后少一些。
function makeHearts(count: number): FloatingHeart[] {
  return Array.from({ length: count }, (_, index) => ({
    id: Date.now() + index,
    x: Math.round((Math.random() - 0.5) * 120),
    rise: Math.round(70 + Math.random() * 60),
    rotate: Math.round((Math.random() - 0.5) * 50),
    size: Math.round(12 + Math.random() * 12),
    delay: Math.round(Math.random() * 180),
  }));
}

// 首屏底部的“喜欢本站”和“订阅”（同 Shiro 首页底部的两个按钮）。
// 喜欢：浏览器直接 POST Core 的 /like_this（按访客 IP 每天一次，经 Next 转发会变成所有人共用服务器 IP）。
// 点一下飘出一串爱心，按钮上方冒出一个文字气泡，过两秒自己消失：第一次是“谢谢你的喜欢！”，
// 今天已经点过（本机记过，或 Core 回“一天一次就够啦”）就只提示，不再请求。
// 订阅：点按钮才浮出订阅表单；后台没开订阅时不显示这个按钮。
export default function SiteActions({ apiUrl, siteName, likes, subscribeTypes, mailIcon }: Props) {
  const [count, setCount] = useState(likes);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [bubble, setBubble] = useState<{ text: string; key: number } | null>(null);
  const [pending, setPending] = useState(false);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // 订阅浮层打开时光标直接落在邮箱输入框里；触屏时不聚焦输入框，免得一打开就弹出软键盘挡住浮层
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(bubbleTimer.current), []);

  function celebrate(text: string, heartCount: number) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && heartCount) {
      const burst = makeHearts(heartCount);
      setHearts((current) => [...current, ...burst]);
      setTimeout(() => setHearts((current) => current.filter((heart) => !burst.includes(heart))), 1600);
    }
    clearTimeout(bubbleTimer.current);
    setBubble({ text, key: Date.now() });
    bubbleTimer.current = setTimeout(() => setBubble(null), 2200);
  }

  async function like() {
    if (pending) return;
    let likedToday = false;
    try {
      likedToday = localStorage.getItem(likedKey) === today();
    } catch {}
    if (likedToday) return celebrate("一天一次就够啦", 4);
    setPending(true);
    try {
      const response = await fetch(`${apiUrl}/like_this`, { method: "POST" });
      try {
        localStorage.setItem(likedKey, today());
      } catch {}
      if (response.ok) {
        setCount((value) => (value ?? 0) + 1);
        celebrate("谢谢你的喜欢！", 10);
      } else {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        celebrate(body?.message || "一天一次就够啦", 4);
      }
    } catch {
      celebrate("网络有点问题，等会儿再试试", 0);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="site-actions">
      <div className="site-like">
        <button className="site-action is-like" type="button" onClick={like}>
          喜欢本站
          <Heart size={16} aria-hidden="true" />
          {count !== null && <span className="site-action-count">{count}</span>}
        </button>
        <div className="site-like-hearts" aria-hidden="true">
          {hearts.map((heart) => (
            <span
              key={heart.id}
              style={{
                "--heart-x": `${heart.x}px`,
                "--heart-rise": `${heart.rise}px`,
                "--heart-rotate": `${heart.rotate}deg`,
                "--heart-delay": `${heart.delay}ms`,
                fontSize: `${heart.size}px`,
              } as React.CSSProperties}
            >
              <Heart size="1em" />
            </span>
          ))}
        </div>
        {bubble && <p key={bubble.key} className="site-like-bubble" role="status">{bubble.text}</p>}
      </div>
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
                  <span className="subscribe-icon" aria-hidden="true">{mailIcon}</span>
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
    </div>
  );
}
