"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState, type MouseEvent, type ReactNode } from "react";
import { useT } from "./locale-provider";
import "./image-lightbox.css";

type Shown = { images: { src: string; alt: string }[]; index: number };

// 点图片放大：包住一段服务端渲染的内容，点到 itemSelector（包着 <img> 的按钮）时弹出全屏查看。
// 同一个 groupSelector 里的几张图可以左右切换（按钮或方向键）；点空白处、按 Esc、点 × 关闭。
export default function ImageLightbox({ itemSelector, groupSelector, children }: { itemSelector: string; groupSelector: string; children: ReactNode }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const [open, setOpen] = useState(false);
  const t = useT().lightbox;

  const onClick = (event: MouseEvent) => {
    const item = (event.target as Element).closest(itemSelector);
    if (!item) return;
    const group = item.closest(groupSelector) ?? item;
    const items = [...group.querySelectorAll(itemSelector)];
    const images = items.map((element) => {
      const img = element.querySelector("img");
      return { src: img?.currentSrc || img?.src || "", alt: img?.alt ?? "" };
    });
    setShown({ images, index: Math.max(0, items.indexOf(item)) });
    setOpen(true);
  };

  const step = (delta: number) =>
    setShown((current) => current && { ...current, index: (current.index + delta + current.images.length) % current.images.length });

  const image = shown?.images[shown.index];
  const many = (shown?.images.length ?? 0) > 1;

  return (
    <div onClick={onClick}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen} onOpenChangeComplete={(isOpen) => !isOpen && setShown(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="lightbox-backdrop" />
          <Dialog.Popup
            className="lightbox"
            aria-label={t.view}
            onKeyDown={(event) => {
              if (!many) return;
              if (event.key === "ArrowLeft") step(-1);
              if (event.key === "ArrowRight") step(1);
            }}
            // 点按钮以外的任何地方（空白处或图片本身）都关闭
            onClick={(event) => !(event.target as Element).closest("button") && setOpen(false)}
          >
            <Dialog.Title className="sr-only">{t.view}</Dialog.Title>
            {image && (
              // eslint-disable-next-line @next/next/no-img-element -- 放大原图，地址来自正文
              <img key={image.src} className="lightbox-image" src={image.src} alt={image.alt} />
            )}
            <Dialog.Close className="lightbox-button lightbox-close" aria-label={t.close}>
              <X size={20} />
            </Dialog.Close>
            {many && shown && (
              <>
                <button type="button" className="lightbox-button lightbox-prev" aria-label={t.prev} onClick={() => step(-1)}>
                  <ChevronLeft size={22} />
                </button>
                <button type="button" className="lightbox-button lightbox-next" aria-label={t.next} onClick={() => step(1)}>
                  <ChevronRight size={22} />
                </button>
                <p className="lightbox-count" aria-live="polite">{shown.index + 1} / {shown.images.length}</p>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
