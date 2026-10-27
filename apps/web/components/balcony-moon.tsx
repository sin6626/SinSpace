"use client";

import { useSyncExternalStore } from "react";
import { moonLitPath, moonPhase } from "../lib/moon";

const noSubscribe = () => () => {};
// 取到 0.005 的精度，同一次渲染里多次读取结果不变（useSyncExternalStore 要求快照稳定）。
const readPhase = () => Math.round(moonPhase(Date.now()) * 200) / 200;

// 名字按亮面比例取，和画出来的样子一致（亮面超过 97% 就画成满月，也叫满月）。
function phaseName(phase: number) {
  const lit = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  if (lit < 0.03) return "新月";
  if (lit > 0.97) return "满月";
  if (phase < 0.5) return lit < 0.4 ? "娥眉月" : lit < 0.6 ? "上弦月" : "盈凸月";
  return lit > 0.6 ? "亏凸月" : lit > 0.4 ? "下弦月" : "残月";
}

// 今晚真实的月相：按访客浏览器的当前时间计算，所以只在浏览器里画亮面；服务端只输出淡淡的月轮廓，水合后亮面淡入。
export default function BalconyMoon() {
  const phase = useSyncExternalStore(noSubscribe, readPhase, () => null);
  const lit = phase === null ? null : moonLitPath(phase, 50, 50, 40);
  const label = phase === null ? "月亮" : `今晚的月亮：${phaseName(phase)}`;
  return (
    <svg className="balcony-moon" viewBox="0 0 100 100" role="img" aria-label={label} data-ready={phase === null ? undefined : ""}>
      <title>{label}</title>
      <circle className="balcony-moon-shadow" cx="50" cy="50" r="40" />
      {lit && <path className="balcony-moon-lit" d={lit} />}
    </svg>
  );
}
