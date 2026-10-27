import type { CSSProperties, ReactNode } from "react";
import BalconyMotion from "./balcony-motion";
import BalconyMoon from "./balcony-moon";
import "./balcony.css";

// 首页第一屏：熄灯后的宿舍阳台。夜空、对面的宿舍楼、阳台栏杆都是确定的 SVG（固定种子生成，服务端与浏览器一致）；
// 月亮按访问当天的真实月相画（balcony-moon.tsx），星星闪烁与流星是 CSS 动画，场景不在视野里时暂停（balcony-motion.tsx）。
// 开灯（浅色）时同一套图形换成黄昏的颜色，颜色全部来自 balcony.css 的 light-dark() 变量。

const width = 1600;
const height = 900;
const railTop = 716;

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (value: number) => Math.round(value * 10) / 10;

function makeStars() {
  const next = random(20261027);
  return Array.from({ length: 170 }, () => {
    const r = next() < 0.12 ? 1.5 + next() * 0.9 : 0.5 + next() * 0.9;
    return {
      x: round(next() * width),
      y: round(Math.pow(next(), 1.35) * 600),
      r: round(r),
      twinkle: next() < 0.65,
      duration: round(3 + next() * 5),
      delay: round(-next() * 8),
    };
  });
}

type Building = { x: number; top: number; w: number; windows: { x: number; y: number }[] };

function makeBuildings(seed: number, minTop: number, maxTop: number, windowSize: [number, number], gap: [number, number], litChance: number) {
  const next = random(seed);
  const buildings: Building[] = [];
  for (let x = -30; x < width; ) {
    const w = Math.round(110 + next() * 170);
    const top = Math.round(minTop + next() * (maxTop - minTop));
    const windows: Building["windows"] = [];
    for (let wy = top + 18; wy < height - windowSize[1]; wy += gap[1]) {
      for (let wx = x + 12; wx < x + w - windowSize[0] - 8; wx += gap[0]) {
        if (next() < litChance) windows.push({ x: wx, y: wy });
      }
    }
    buildings.push({ x, top, w, windows });
    x += w + Math.round(next() * 26);
  }
  return buildings;
}

const stars = makeStars();
const farBuildings = makeBuildings(7, 540, 640, [6, 8], [16, 22], 0.05);
const nearBuildings = makeBuildings(11, 610, 690, [10, 14], [24, 30], 0.08);
const balusters = Array.from({ length: Math.ceil(width / 44) + 1 }, (_, index) => index * 44 + 10);

function Buildings({ items, className, windowSize }: { items: Building[]; className: string; windowSize: [number, number] }) {
  return (
    <g className={className}>
      {items.map((building) => (
        <g key={building.x}>
          <rect className="balcony-building" x={building.x} y={building.top} width={building.w} height={height - building.top} />
          {building.windows.map((item) => (
            <rect key={`${item.x}-${item.y}`} className="balcony-window" x={item.x} y={item.y} width={windowSize[0]} height={windowSize[1]} rx="1" />
          ))}
        </g>
      ))}
    </g>
  );
}

export default function Balcony({ children }: { children: ReactNode }) {
  return (
    <BalconyMotion>
      <svg className="balcony-art" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
        <g className="balcony-stars">
          {stars.map((star, index) => (
            <circle
              key={index}
              className={star.twinkle ? "balcony-star is-twinkle" : "balcony-star"}
              cx={star.x}
              cy={star.y}
              r={star.r}
              style={{ "--twinkle-duration": `${star.duration}s`, "--twinkle-delay": `${star.delay}s` } as CSSProperties}
            />
          ))}
        </g>
        <Buildings items={farBuildings} className="balcony-far" windowSize={[6, 8]} />
        <Buildings items={nearBuildings} className="balcony-near" windowSize={[10, 14]} />
        <g className="balcony-railing">
          <rect x="0" y={railTop} width={width} height="10" rx="2" />
          <rect x="0" y={railTop + 52} width={width} height="4" />
          {balusters.map((x) => <rect key={x} x={x} y={railTop + 8} width="5" height={height - railTop} />)}
          <rect x="0" y={height - 26} width={width} height="26" />
        </g>
      </svg>
      <span className="balcony-meteor" />
      <span className="balcony-meteor is-late" />
      <BalconyMoon />
      <div className="balcony-text">{children}</div>
      <a className="balcony-down" href="#home-room">回屋里看看 <span aria-hidden="true">↓</span></a>
    </BalconyMotion>
  );
}
