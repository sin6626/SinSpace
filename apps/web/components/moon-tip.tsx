"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { useState, type Ref } from "react";
import { moonInfo } from "../lib/moon";
import "./moon-tip.css";

// 首屏月亮上的透明热区：悬停（或键盘聚焦）时说一句今晚的月相。位置由 starfield.tsx 按画布里月亮的位置设置。
// 说明在弹出时才按当前时间计算，不进服务端渲染，避免水合时间差。
export default function MoonTip({ ref }: { ref: Ref<HTMLButtonElement> }) {
  const [info, setInfo] = useState<ReturnType<typeof moonInfo> | null>(null);
  return (
    <Tooltip.Root onOpenChange={(open) => { if (open) setInfo(moonInfo(Date.now())); }}>
      <Tooltip.Trigger ref={ref} className="moon-tip-trigger" aria-label="今晚的月亮" delay={150} />
      <Tooltip.Portal>
        <Tooltip.Positioner className="moon-tip-positioner" side="bottom" sideOffset={10}>
          <Tooltip.Popup className="moon-tip">
            {info && (
              <>
                <strong className="moon-tip-title">今晚是{info.name}</strong>
                <span>亮面约 {info.illumination}%，月龄 {info.age} 天</span>
                <span>再过 {info.daysToNext} 天是{info.next}</span>
              </>
            )}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
