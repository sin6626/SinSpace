import Link from "./locale-provider";
import "./corners.css";
import { notFound, unstable_rethrow } from "next/navigation";
import { getSays } from "../lib/blog-data";
import { formatDate } from "../lib/date";
import { getT } from "../lib/i18n/server";
import LoadError from "./load-error";

export default async function SayList({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const { page: rawPage = "1" } = await searchParams;
  if (typeof rawPage !== "string" || !/^[1-9]\d*$/.test(rawPage)) notFound();
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page)) notFound();
  const pageHref = (number: number) => number === 1 ? "/says" : `/says?page=${number}`;
  const { says: t, list } = await getT();
  let result: Awaited<ReturnType<typeof getSays>>;
  try {
    result = await getSays(page);
    if (page > Math.max(1, result.pagination.totalPage)) notFound();
  } catch (error) {
    unstable_rethrow(error);
    return <LoadError what={t.title} href={pageHref(page)} />;
  }
  const { data: says, pagination } = result;

  return (
    <>
      <header className="page-heading">
        <h1>{t.title}</h1>
        <p className="post-meta">{t.count(pagination.total)}</p>
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
        ) : <p className="post-empty">{t.empty}</p>}
        {pagination.totalPage > 1 && (
          <nav className="post-pagination" aria-label={list.pagination(t.title)}>
            {pagination.hasPrevPage ? <Link href={pageHref(page - 1)} rel="prev">{list.prev}</Link> : <span>{list.prev}</span>}
            <span>{list.page(page, pagination.totalPage)}</span>
            {pagination.hasNextPage ? <Link href={pageHref(page + 1)} rel="next">{list.next}</Link> : <span>{list.next}</span>}
          </nav>
        )}
      </div>
    </>
  );
}
