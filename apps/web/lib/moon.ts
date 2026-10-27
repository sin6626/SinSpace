// 月相：按平均朔望月从一个已知新月往后推算，误差在一天以内，画首页的月亮足够。
const synodicMonth = 29.530588853;
const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);

// 0 是新月，0.5 是满月，接近 1 又回到新月。
export function moonPhase(time: number) {
  const months = (time - knownNewMoon) / 86_400_000 / synodicMonth;
  return ((months % 1) + 1) % 1;
}

// 被照亮部分的 SVG 路径（北半球视角：上半月亮在右，下半月亮在左）。新月几乎看不见时返回 null，只画轮廓。
// 外沿是半个圆；明暗交界线是椭圆弧，横半径 r·|cos 2πp|，月牙时向亮面鼓，凸月时向暗面鼓。
export function moonLitPath(phase: number, cx: number, cy: number, r: number) {
  const k = Math.cos(2 * Math.PI * phase);
  const lit = (1 - k) / 2;
  if (lit < 0.02) return null;
  if (lit > 0.97) return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  const litRight = phase < 0.5;
  const crescent = k > 0;
  const outerSweep = litRight ? 1 : 0;
  const innerSweep = litRight === crescent ? 0 : 1;
  const rx = (r * Math.abs(k)).toFixed(2);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${innerSweep} ${cx} ${cy - r} Z`;
}

// 月相名称按亮面比例取，和画出来的样子一致（亮面超过 97% 就画成满月，也叫满月）。
export function moonPhaseName(phase: number) {
  const lit = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  if (lit < 0.03) return "新月";
  if (lit > 0.97) return "满月";
  if (phase < 0.5) return lit < 0.4 ? "娥眉月" : lit < 0.6 ? "上弦月" : "盈凸月";
  return lit > 0.6 ? "亏凸月" : lit > 0.4 ? "下弦月" : "残月";
}

// 首屏悬停月亮时的说明：月相名、亮面比例、月龄，以及离下一次满月或新月还有几天。
// 正在变圆说满月、变缺说新月；本身已算满月（或新月）时，下一个就是另一个。
export function moonInfo(time: number) {
  const phase = moonPhase(time);
  const name = moonPhaseName(phase);
  const target = name === "满月" ? 0 : name === "新月" ? 0.5 : phase < 0.5 ? 0.5 : 0;
  return {
    name,
    illumination: Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100),
    age: Math.round(phase * synodicMonth * 10) / 10,
    next: target === 0.5 ? "满月" : "新月",
    daysToNext: Math.max(1, Math.round((((target - phase + 1) % 1) || 1) * synodicMonth)),
  };
}
