import Link from "./locale-provider";
import "./corners.css";
import { notFound, unstable_rethrow } from "next/navigation";
import { getSays } from "../lib/blog-data";
import { formatDate } from "../lib/date";

export default async function SayList({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const { page: rawPage = "1" } = await searchParams;
  if (typeof rawPage !== "string" || !/^[1-9]\d*$/.test(rawPage)) notFound();
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page)) notFound();
  const pageHref = (number: number) => number === 1 ? "/says" : `/says?page=${number}`;
  let result: Awaited<ReturnType<typeof getSays>>;
  try {
    result = await getSays(page);
    if (page > Math.max(1, result.pagination.totalPage)) notFound();
  } catch (error) {
    unstable_rethrow(error);
    return <p className="post-list-content" role="alert">一言读取失败。<a href={pageHref(page)}>重试</a></p>;
  }
  const { data: says, pagination } = result;

  return (
    <>
      <header className="page-heading">
        <h1>一言</h1>
        <p className="post-meta">共 {pagination.total} 条</p>
      </header>
      <div className="post-list-content">
        {says.length ? (
          <ul className="say-list">
            {says.map((say) => (
              <li key={say.id} className="say-card">
                <blockquote>
                  <p>{say.text}</p>
                  {(say.author || say.source) && (
                    <footer className="post-meta">
                      {say.author && <span>{say.author}</span>}
                      {say.source && <cite>{say.source}</cite>}
                    </footer>
                  )}
                </blockquote>
                <time className="say-date" dateTime={say.created}>{formatDate(say.created)}</time>
              </li>
            ))}
          </ul>
        ) : <p className="post-empty">还没有一言。</p>}
        {pagination.totalPage > 1 && (
          <nav className="post-pagination" aria-label="一言分页">
            {pagination.hasPrevPage ? <Link href={pageHref(page - 1)} rel="prev">上一页</Link> : <span>上一页</span>}
            <span>第 {page} / {pagination.totalPage} 页</span>
            {pagination.hasNextPage ? <Link href={pageHref(page + 1)} rel="next">下一页</Link> : <span>下一页</span>}
          </nav>
        )}
      </div>
    </>
  );
}
