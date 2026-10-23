import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { getNotes } from "../lib/blog-data";
import { formatDate } from "../lib/date";

export default async function NoteList({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const { page: rawPage = "1" } = await searchParams;
  if (typeof rawPage !== "string" || !/^[1-9]\d*$/.test(rawPage)) notFound();
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page)) notFound();
  const pageHref = (number: number) => number === 1 ? "/notes" : `/notes?page=${number}`;

  let result: Awaited<ReturnType<typeof getNotes>>;
  try {
    result = await getNotes(page);
    if (page > Math.max(1, result.pagination.totalPage)) notFound();
  } catch (error) {
    unstable_rethrow(error);
    return <p className="post-list-content" role="alert">手记读取失败。<a href={pageHref(page)}>重试</a></p>;
  }
  const { data: notes, pagination } = result;

  return (
    <>
      <header className="page-heading">
        <h1>手记</h1>
        <p className="post-meta">共 {pagination.total} 篇手记</p>
      </header>
      <div className="post-list-content">
        {notes.length ? (
          <ul className="post-list">
            {notes.map((note) => (
              <li key={note.id}>
                <article>
                  <h2><Link href={`/notes/${note.nid}`}>{note.title}</Link></h2>
                  <div className="post-meta">
                    <time dateTime={note.created}>{formatDate(note.created)}</time>
                    {note.topic && <span>{note.topic}</span>}
                    {note.mood && <span>心情：{note.mood}</span>}
                    {note.weather && <span>天气：{note.weather}</span>}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        ) : <p className="post-empty">还没有公开的手记。</p>}
        {pagination.totalPage > 1 && (
          <nav className="post-pagination" aria-label="手记分页">
            {pagination.hasPrevPage ? <Link href={pageHref(page - 1)} rel="prev">上一页</Link> : <span>上一页</span>}
            <span>第 {page} / {pagination.totalPage} 页</span>
            {pagination.hasNextPage ? <Link href={pageHref(page + 1)} rel="next">下一页</Link> : <span>下一页</span>}
          </nav>
        )}
      </div>
    </>
  );
}
