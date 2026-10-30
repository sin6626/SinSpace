import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { buildSky, parseGitHub, parseLeetCode } from "./sky-calendar";

// 页脚星带的数据：站长在力扣（中国站）刷题和在 GitHub 写代码的每日提交。两边都是不需要登录的公开页面/接口
// （不是官方承诺的公开 API，格式可能会变）。服务端取、缓存几个小时，访客的浏览器不直接连第三方。
// 一边读取失败只显示另一边；两边都失败时抛错，由页脚隐藏星带，下次请求再试（失败不进缓存）。
export const skyAccounts = { github: "sin6626", leetcode: "sin-mt" } as const;
export const skyProfiles = {
  github: `https://github.com/${skyAccounts.github}`,
  leetcode: `https://leetcode.cn/u/${skyAccounts.leetcode}/`,
} as const;

const years = 3;

async function leetCodeYear(year: number | null) {
  const response = await fetch("https://leetcode.cn/graphql/noj-go/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: "query($userSlug: String!, $year: Int) { userCalendar(userSlug: $userSlug, year: $year) { activeYears submissionCalendar } }",
      variables: { userSlug: skyAccounts.leetcode, year },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`LeetCode HTTP ${response.status}`);
  const { data } = (await response.json()) as { data?: { userCalendar?: { activeYears: number[]; submissionCalendar: string } } };
  if (!data?.userCalendar) throw new Error("LeetCode calendar missing");
  return data.userCalendar;
}

async function leetCode(from: number) {
  const { activeYears } = await leetCodeYear(null);
  const calendars = await Promise.all(activeYears.filter((year) => year >= from).map(leetCodeYear));
  return new Map(calendars.flatMap(({ submissionCalendar }) => [...parseLeetCode(submissionCalendar)]));
}

async function gitHub(from: number, to: number) {
  const pages = await Promise.all(Array.from({ length: to - from + 1 }, async (_, index) => {
    const year = from + index;
    const response = await fetch(`https://github.com/users/${skyAccounts.github}/contributions?from=${year}-01-01&to=${year}-12-31`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    return parseGitHub(await response.text());
  }));
  return new Map(pages.flatMap((days) => [...days]));
}

export async function getActivitySky() {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 21600, expire: 86400 });
  cacheTag("activity-sky");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  const thisYear = Number(today.slice(0, 4));
  const [leetcode, github] = await Promise.allSettled([leetCode(thisYear - years + 1), gitHub(thisYear - years + 1, thisYear)]);
  if (leetcode.status === "rejected" && github.status === "rejected") throw new Error("activity sky unavailable", { cause: [leetcode.reason, github.reason] });
  const value = (result: PromiseSettledResult<Map<string, number>>) => (result.status === "fulfilled" ? result.value : new Map<string, number>());
  return buildSky(value(leetcode), value(github), today, years * 53);
}
