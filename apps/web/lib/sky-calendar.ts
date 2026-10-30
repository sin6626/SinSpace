// 页脚星带（components/footer-sky.tsx）用的纯函数：解析力扣和 GitHub 的每日提交，排成“周 × 星期”的格子。
// 不依赖 Next，检查脚本 scripts/verify-sky-calendar.mjs 直接加载。

export type SkySource = "leetcode" | "github";
export type SkyDay = { date: string; leetcode: number; github: number; level: number; kind: SkySource | "both" | null };
export type Sky = { days: (SkyDay | null)[]; weeks: number; years: { year: string; week: number }[] };

const dayMs = 86_400_000;
const toDate = (time: number) => new Date(time).toISOString().slice(0, 10);
const timeOf = (date: string) => Date.parse(`${date}T00:00:00Z`);

// 力扣中国站 userCalendar.submissionCalendar：JSON 字符串，键是那天 0 点（UTC）的秒级时间戳，值是提交次数
export function parseLeetCode(calendar: string) {
  const days = new Map<string, number>();
  for (const [seconds, count] of Object.entries(JSON.parse(calendar) as Record<string, number>)) {
    if (Number(count) > 0) days.set(toDate(Number(seconds) * 1000), Number(count));
  }
  return days;
}

// GitHub 公开的贡献日历页（github.com/users/<name>/contributions）：每天一个 data-date 格子，次数写在对应的 <tool-tip> 里
export function parseGitHub(html: string) {
  const tips = new Map([...html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)].map((match) => [match[1], match[2]]));
  const days = new Map<string, number>();
  for (const [, date, id] of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"\s+id="([^"]+)"/g)) {
    const count = Number(tips.get(id)?.match(/^(\d+) contributions?/)?.[1] ?? 0);
    if (count > 0) days.set(date, count);
  }
  return days;
}

// 每种来源按自己的分布分四档亮度（四分位数），提交多的日子更亮；两边各自比较，刷题次数多不会把写代码的日子压暗
function leveler(days: Map<string, number>) {
  const sorted = [...days.values()].sort((a, b) => a - b);
  const at = (ratio: number) => sorted[Math.floor((sorted.length - 1) * ratio)] ?? 0;
  const [q1, q2, q3] = [at(0.25), at(0.5), at(0.75)];
  return (count: number) => (count <= 0 ? 0 : count <= q1 ? 1 : count <= q2 ? 2 : count <= q3 ? 3 : 4);
}

// 从最早有记录的那一周（周一）排到今天所在的那一周，最多 maxWeeks 周；今天之后的格子为 null。
// 没有任何记录时返回 null。years：每年 1 月 1 日落在第几周（第一年从第 0 周开始），给下面的年份刻度用。
export function buildSky(leetcode: Map<string, number>, github: Map<string, number>, today: string, maxWeeks = 156): Sky | null {
  const end = timeOf(today);
  const earliest = Math.min(...[...leetcode.keys(), ...github.keys()].map(timeOf).filter((time) => time <= end));
  if (!Number.isFinite(earliest)) return null;
  const monday = (time: number) => time - ((new Date(time).getUTCDay() + 6) % 7) * dayMs;
  const lastMonday = monday(end);
  const start = Math.max(monday(earliest), lastMonday - (maxWeeks - 1) * 7 * dayMs);
  const weeks = (lastMonday - start) / (7 * dayMs) + 1;
  const level = { leetcode: leveler(leetcode), github: leveler(github) };
  const days: (SkyDay | null)[] = [];
  const years: Sky["years"] = [];
  for (let index = 0; index < weeks * 7; index++) {
    const time = start + index * dayMs;
    const date = toDate(time);
    if (index === 0 || date.endsWith("-01-01")) years.push({ year: date.slice(0, 4), week: Math.floor(index / 7) });
    if (time > end) {
      days.push(null);
      continue;
    }
    const counts = { leetcode: leetcode.get(date) ?? 0, github: github.get(date) ?? 0 };
    const kind = counts.leetcode && counts.github ? "both" : counts.leetcode ? "leetcode" : counts.github ? "github" : null;
    days.push({ date, ...counts, level: Math.max(level.leetcode(counts.leetcode), level.github(counts.github)), kind });
  }
  // 第一年如果离下一个 1 月 1 日太近（不到 8 周），只留后面那个刻度，免得两个年份挤在一起
  if (years.length > 1 && years[1].week < 8) years.shift();
  return { days, weeks, years };
}
