"use client";

import { Popover } from "@base-ui/react/popover";
import { useState, type CSSProperties, type ReactNode } from "react";
import type { SocialCard } from "../lib/social";
import { useT } from "./locale-provider";
import "./contact-card.css";

// 首屏的微信、QQ 名片：这类平台没有网页主页，点图标弹出一张小卡片，放二维码和号码（可复制）。
// 图标由服务端渲染好传进来（Iconify 只在服务端用）；点外面或按 Esc 关闭。
export default function ContactCard({ card, icon }: { card: SocialCard; icon: ReactNode }) {
  const t = useT().contactCard;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!card.id) return;
    try {
      await navigator.clipboard.writeText(card.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // 剪贴板不可用（如非安全上下文）时号码仍显示在卡片上，可以手动选中
    }
  };

  // 鼠标移上或键盘聚焦时就开始加载二维码，点开时多半已经加载好
  const prefetch = () => {
    if (card.qr) new Image().src = card.qr;
  };

  return (
    <Popover.Root>
      <Popover.Trigger className="contact-trigger" aria-label={t.open(card.label)} title={card.label} onPointerEnter={prefetch} onFocus={prefetch}>
        {icon}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="contact-card-positioner" side="top" sideOffset={14} collisionPadding={16}>
          <Popover.Popup className="contact-card" style={{ "--brand": card.color } as CSSProperties}>
            <Popover.Title className="contact-card-title">
              <span className="contact-card-icon" aria-hidden="true">{icon}</span>
              {card.label}
            </Popover.Title>
            {card.qr && (
              // eslint-disable-next-line @next/next/no-img-element -- 后台上传到图床的二维码
              <img className="contact-card-qr" src={card.qr} alt={t.qrAlt(card.label)} />
            )}
            {card.id && (
              <p className="contact-card-id">
                <span>{card.id}</span>
                <button type="button" className="btn btn-sm" onClick={copy} aria-live="polite">
                  {copied ? t.copied : t.copy}
                </button>
              </p>
            )}
            {!card.qr && <p className="contact-card-hint">{t.hint}</p>}
            <Popover.Arrow className="contact-card-arrow" />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
