import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { getTimeline } from "../lib/blog-data";
import { formatDate } from "../lib/date";

type Item = Awaited<ReturnType<typeof getTimeline>>[number];

const href = (item: Item) => item.kind === "post"
  ? `/posts/${encodeURIComponent(item.category.slug)}/${encodeURIComponent(item.slug)}`
  : `/notes/${item.nid}`;

// 归档：按年分组列出全部文章与手记。年份取自 formatDate（固定东八区），与站内其他日期一致。
export default async function TimelineList() {
  let items: Item[];
  try {
    items = await getTimeline();
  } catch (error) {
    unstable_rethrow(error);
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- 重试用整页加载，确保重新请求
    return <p className="post-list-content" role="alert">时间线读取失败。<a href="/timeline">重试</a></p>;
  }
  const years = new Map<string, { item: Item; date: string }[]>();
  for (const item of items) {
    const date = formatDate(item.created);
    const year = date.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), { item, date }]);
  }
  const postCount = items.filter((item) => item.kind === "post").length;

  return (
    <>
      <header className="page-heading">
        <h1>时间线</h1>
        <p className="post-meta">共 {postCount} 篇文章、{items.length - postCount} 篇手记</p>
      </header>
      <div className="post-list-content">
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
