import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { getTimeline } from "../lib/blog-data";
import { formatDate } from "../lib/date";

type Item = Awaited<ReturnType<typeof getTimeline>>[number];

const href = (item: Item) => item.kind === "post"
  ? `/posts/${encodeURIComponent(item.category.slug)}/${encodeURIComponent(item.slug)}`
  : `/notes/${item.nid}`;

// 时间线的三个子页：全部（/timeline）、只看文章（/timeline/posts）、只看手记（/timeline/notes）
const views = [
  { kind: undefined, href: "/timeline", label: "全部" },
  { kind: "post", href: "/timeline/posts", label: "文章" },
  { kind: "note", href: "/timeline/notes", label: "手记" },
] as const;

// 归档：按年分组列出文章与手记（kind 指定时只列一种）。年份取自 formatDate（固定东八区），与站内其他日期一致。
export default async function TimelineList({ kind }: { kind?: Item["kind"] }) {
  const view = views.find((item) => item.kind === kind) ?? views[0];
  let all: Item[];
  try {
    all = await getTimeline();
  } catch (error) {
    unstable_rethrow(error);
    // 重试用整页加载（普通 <a>），确保重新请求
    return <p className="post-list-content" role="alert">时间线读取失败。<a href={view.href}>重试</a></p>;
  }
  const items = kind ? all.filter((item) => item.kind === kind) : all;
  const years = new Map<string, { item: Item; date: string }[]>();
  for (const item of items) {
    const date = formatDate(item.created);
    const year = date.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), { item, date }]);
  }
  const postCount = all.filter((item) => item.kind === "post").length;
  const counts = { post: postCount, note: all.length - postCount };

  return (
    <>
      <header className="page-heading">
        <h1>时间线</h1>
        <p className="post-meta">{kind ? `共 ${counts[kind]} 篇${view.label}` : `共 ${postCount} 篇文章、${counts.note} 篇手记`}</p>
      </header>
      <div className="post-list-content">
        <div className="list-filters">
          <nav className="post-categories" aria-label="时间线分类">
            {views.map((item) => (
              <Link key={item.href} href={item.href} aria-current={item.href === view.href ? "page" : undefined}>{item.label}</Link>
            ))}
          </nav>
        </div>
        {years.size ? [...years].map(([year, entries]) => (
          <section key={year} className="timeline-year" aria-labelledby={`timeline-${year}`}>
            <h2 id={`timeline-${year}`}>{year} <span className="timeline-count">{entries.length} 篇</span></h2>
            <ol className="timeline-list">
              {entries.map(({ item, date }) => (
                <li key={`${item.kind}-${item.id}`}>
                  <time dateTime={item.created}>{date.slice(5)}</time>
                  <Link href={href(item)}>{item.title}</Link>
                  <span className="post-meta">{item.kind === "post" ? item.category.name : "手记"}</span>
                </li>
              ))}
            </ol>
          </section>
        )) : <p className="post-empty">还没有内容。</p>}
      </div>
    </>
  );
}
