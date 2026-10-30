import Link from "./locale-provider";
import { notFound, unstable_rethrow } from "next/navigation";
import { getMurmurs, getOwner } from "../lib/blog-data";
import { formatDate, formatTime } from "../lib/date";
import ImageLightbox from "./image-lightbox";
import MurmurBody from "./murmur-body";
import "./murmurs.css";

type Murmur = Awaited<ReturnType<typeof getMurmurs>>["data"][number];

const dayFormatter = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", timeZone: "Asia/Shanghai" });
const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", { weekday: "short", timeZone: "Asia/Shanghai" });

// 按东八区的日期分组，列表本身已经从新到旧
function byDay(items: Murmur[]) {
  const days: { key: string; year: string; items: Murmur[] }[] = [];
  for (const item of items) {
    const key = formatDate(item.created);
    const last = days.at(-1);
    if (last?.key === key) last.items.push(item);
    else days.push({ key, year: key.slice(0, 4), items: [item] });
  }
  return days;
}

// 碎碎念：站长随口说的闲话。像睡前的自言自语，按天分段，每天一串气泡，头像在旁边；没有赞踩、没有评论。
// 点图片放大，同一条里的几张图可以左右切换。
export function MurmurStream({ items, avatar, name }: { items: Murmur[]; avatar?: string; name: string }) {
  const days = byDay(items);
  return (
    <ImageLightbox itemSelector=".murmur-zoom" groupSelector=".murmur-bubble">
      <div className="murmur-stream">
        {days.map((day, index) => {
          const date = new Date(day.items[0].created);
          // 跨年的那一段才写年份
          const showYear = index === 0 || days[index - 1].year !== day.year;
          return (
            <section key={day.key} className="murmur-day" aria-label={`${day.year} 年${dayFormatter.format(date)}`}>
              <h2 className="murmur-date">
                {showYear && <span className="murmur-year">{day.year}</span>}
                <span>{dayFormatter.format(date)}</span>
                <small>{weekdayFormatter.format(date)}</small>
              </h2>
              <div className="murmur-group">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 后台个人资料里的头像
                  <img className="murmur-avatar" src={avatar} alt={name} width={36} height={36} loading="lazy" />
                ) : <span className="murmur-avatar" aria-hidden="true">{name.slice(0, 1)}</span>}
                <ol className="murmur-bubbles">
                  {day.items.map((item) => (
                    <li key={item.id} className="murmur-bubble" data-image={/!\[[^\]]*\]\(/.test(item.content) ? "" : undefined}>
                      <MurmurBody content={item.content} />
                      <time dateTime={item.created} title={item.modified ? `改于 ${formatDate(item.modified)} ${formatTime(item.modified)}` : undefined}>
                        {formatTime(item.created)}
                      </time>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          );
        })}
      </div>
    </ImageLightbox>
  );
}

export default async function MurmurList({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const { page: rawPage = "1" } = await searchParams;
  if (typeof rawPage !== "string" || !/^[1-9]\d*$/.test(rawPage)) notFound();
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page)) notFound();
  const pageHref = (number: number) => (number === 1 ? "/murmurs" : `/murmurs?page=${number}`);
  let result: Awaited<ReturnType<typeof getMurmurs>>;
  let owner: Awaited<ReturnType<typeof getOwner>> | null;
  try {
    [result, owner] = await Promise.all([getMurmurs(page), getOwner().catch(() => null)]);
    if (page > Math.max(1, result.pagination.totalPage)) notFound();
  } catch (error) {
    unstable_rethrow(error);
    return <p className="post-list-content" role="alert">碎碎念读取失败。<a href={pageHref(page)}>重试</a></p>;
  }
  const { data, pagination } = result;

  return (
    <>
      <header className="page-heading">
        <h1>碎碎念</h1>
        <p className="post-meta">随口说的闲话：问 AI 时遇到的新词，用自己的话再讲一遍。</p>
      </header>
      <div className="post-list-content">
        {data.length ? <MurmurStream items={data} avatar={owner?.avatar} name={owner?.name ?? "Sin"} /> : <p className="post-empty">还没有碎碎念。</p>}
        {pagination.totalPage > 1 && (
          <nav className="post-pagination" aria-label="碎碎念分页">
            {pagination.hasPrevPage ? <Link href={pageHref(page - 1)} rel="prev">更近的</Link> : <span />}
            <span>第 {page} / {pagination.totalPage} 页</span>
            {pagination.hasNextPage ? <Link href={pageHref(page + 1)} rel="next">更早的</Link> : <span />}
          </nav>
        )}
      </div>
    </>
  );
}
