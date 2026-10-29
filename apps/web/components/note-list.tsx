import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { getNotes } from "../lib/blog-data";
import { readText } from "../lib/search-params";
import { NoteSearch, NotesByTopic } from "./note-filter";
import NoteTopicDrawer from "./note-sidebar";
import Entry, { EntryTag } from "./entry";
import SidebarSearch from "./sidebar-search";
import "./details-sidebar.css";
import "./corners.css";

type NoteEntryData = Awaited<ReturnType<typeof getNotes>>["data"][number];

// 心里话的角落：日记的样子。左边是大号的日，右边是衬线标题、话题/心情/天气和正文开头。首页预览复用。
// 话题标签在标题右边，心情、天气在下一行。
export function NoteEntry({ note, headingLevel = 2 }: { note: NoteEntryData; headingLevel?: 2 | 3 }) {
  return (
    <Entry
      href={`/notes/${note.nid}`}
      title={note.title}
      created={note.created}
      headingLevel={headingLevel}
      serif
      excerpt={note.excerpt}
      stats={note.stats}
      tags={note.topic ? <EntryTag>{note.topic}</EntryTag> : undefined}
      meta={note.mood || note.weather ? <>
        {note.mood && <span>心情 · {note.mood}</span>}
        {note.weather && <span>天气 · {note.weather}</span>}
      </> : undefined}
    />
  );
}

export default async function NoteList({ searchParams }: { searchParams: Promise<{ page?: string | string[]; q?: string | string[]; topic?: string | string[] }> }) {
  const { page: rawPage = "1", q, topic } = await searchParams;
  const keyword = readText(q);
  const topicSlug = readText(topic, 100);
  const search = <SidebarSearch action="/notes" label="搜索手记" defaultValue={keyword} />;
  const topics = <Suspense fallback={null}><NoteTopicDrawer activeTopic={topicSlug || undefined} /></Suspense>;
  if (keyword) return <NoteSearch keyword={keyword} search={search} filters={topics} />;
  if (topicSlug) return <NotesByTopic slug={topicSlug} search={search} filters={topics} />;
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
      <header className="page-heading list-heading">
        <div>
          <h1>手记</h1>
          <p className="post-meta">共 {pagination.total} 篇手记</p>
        </div>
        {search}
      </header>
      <div className="post-list-content">
        <div className="list-filters">{topics}</div>
        {notes.length ? (
          <ul className="note-list">
            {notes.map((note) => (
              <li key={note.id}><NoteEntry note={note} /></li>
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
