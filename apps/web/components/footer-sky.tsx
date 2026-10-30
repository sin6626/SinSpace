import type { CSSProperties } from "react";
import { unstable_rethrow } from "next/navigation";
import { getActivitySky, skyProfiles } from "../lib/activity-sky";
import { getT } from "../lib/i18n/server";
import "./footer-sky.css";

// 页脚的星带：从最早有记录的那一周到今天，一天一颗星（每列一周、每行一个星期几），那天提交越多越亮。
// 力扣刷题是月光色、GitHub 写代码是星光紫，两样都有的日子是两种颜色调在一起；从左到右能看出“从刷题到写代码”的过渡。
// 不写总数，只在悬停时用 title 显示那天的日期和次数。读取失败时整块不显示。
export default async function FooterSky() {
  let sky: Awaited<ReturnType<typeof getActivitySky>>;
  try {
    sky = await getActivitySky();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
  if (!sky) return null;
  const t = (await getT()).footer;
  const first = sky.days.find((day) => day?.kind)?.date ?? sky.days[0]!.date;
  return (
    <figure className="footer-sky" style={{ "--weeks": sky.weeks } as CSSProperties}>
      <div className="footer-sky-years" aria-hidden="true">
        {sky.years.map(({ year, week }) => <span key={year} style={{ "--week": week } as CSSProperties}>{year}</span>)}
      </div>
      <div className="footer-sky-band" role="img" aria-label={t.sky(Number(first.slice(0, 4)), Number(first.slice(5, 7)))}>
        {sky.days.map((day, index) => {
          if (!day) return <i key={index} className="is-future" />;
          if (!day.kind) return <i key={index} />;
          const parts = [day.date, day.leetcode && `LeetCode ${day.leetcode}`, day.github && `GitHub ${day.github}`].filter(Boolean);
          return <i key={index} className={`is-${day.kind}`} data-level={day.level} title={parts.join(" · ")} style={day.level === 4 ? { "--twinkle": index % 9 } as CSSProperties : undefined} />;
        })}
      </div>
      <figcaption className="footer-sky-legend" aria-label={t.skyLegend}>
        <a className="is-leetcode" href={skyProfiles.leetcode} target="_blank" rel="noopener noreferrer">LeetCode</a>
        <a className="is-github" href={skyProfiles.github} target="_blank" rel="noopener noreferrer">GitHub</a>
      </figcaption>
    </figure>
  );
}
