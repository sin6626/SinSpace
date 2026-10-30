import Link from "./locale-provider";
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
import { getLocale, getT } from "../lib/i18n/server";
import LoadError from "./load-error";

type NoteEntryData = Awaited<ReturnType<typeof getNotes>>["data"][number];

// 心里话的角落：日记的样子。左边是大号的日，右边是衬线标题、话题/心情/天气和正文开头。首页预览复用。
// 话题标签在标题右边，心情、天气在下一行。
export async function NoteEntry({ note, headingLevel = 2 }: { note: NoteEntryData; headingLevel?: 2 | 3 }) {
  const { list } = await getT();
  return (
    <Entry
      href={`/notes/${note.nid}`}
      title={note.title}
      created={note.created}
      headingLevel={headingLevel}
      lang={note.original ? "zh-CN" : undefined}
      serif
      excerpt={note.excerpt}
      stats={note.stats}
      tags={note.topic ? <EntryTag>{note.topic}</EntryTag> : undefined}
      meta={note.mood || note.weather ? <>
        {note.mood && <span>{list.mood(note.mood)}</span>}
        {note.weather && <span>{list.weather(note.weather)}</span>}
      </> : undefined}
    />
  );
}

export default async function NoteList({ searchParams }: { searchParams: Promise<{ page?: string | string[]; q?: string | string[]; topic?: string | string[] }> }) {
  const [{ page: rawPage = "1", q, topic }, { notes: t, list }] = await Promise.all([searchParams, getT()]);
  const keyword = readText(q);
  const topicSlug = readText(topic, 100);
  const search = <SidebarSearch action="/notes" label={t.search} defaultValue={keyword} />;
  const topics = <Suspense fallback={null}><NoteTopicDrawer activeTopic={topicSlug || undefined} /></Suspense>;
  if (keyword) return <NoteSearch keyword={keyword} search={search} filters={topics} />;
  if (topicSlug) return <NotesByTopic slug={topicSlug} search={search} filters={topics} />;
  if (typeof rawPage !== "string" || !/^[1-9]\d*$/.test(rawPage)) notFound();
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page)) notFound();
  const pageHref = (number: number) => number === 1 ? "/notes" : `/notes?page=${number}`;

  let result: Awaited<ReturnType<typeof getNotes>>;
  try {
    result = await getNotes(page, await getLocale());
    if (page > Math.max(1, result.pagination.totalPage)) notFound();
  } catch (error) {
    unstable_rethrow(error);
    return <LoadError what={t.title} href={pageHref(page)} />;
  }
  const { data: notes, pagination } = result;

  return (
    <>
      <header className="page-heading list-heading">
        <div>
          <h1>{t.title}</h1>
          <p className="post-meta">{t.count(pagination.total)}</p>
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
