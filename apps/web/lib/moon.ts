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
