import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { getNote } from "../lib/blog-data";
import { formatDate } from "../lib/date";
import { Suspense } from "react";
import { getApiUrl } from "../lib/config";
import ArticleBody from "./article-body";
import { ArticleAiNotes, ArticleLanguages, loadArticleAi } from "./article-ai";
import ArticleStats from "./article-stats";
import Comments from "./comments";
import { ArticleNotifications, ReadingCount } from "./notifications";
import NoteUnlock from "./note-unlock";
import "./post-detail.css";

export default async function NoteDetail({ params, searchParams }: { params: Promise<{ nid: string }>; searchParams?: Promise<{ lang?: string | string[] }> }) {
  const { nid: rawNid } = await params;
  if (!/^[1-9]\d*$/.test(rawNid) || !Number.isSafeInteger(Number(rawNid))) notFound();
  const href = `/notes/${rawNid}`;
  let note: Awaited<ReturnType<typeof getNote>>;
  try {
    note = await getNote(Number(rawNid));
  } catch (error) {
    unstable_rethrow(error);
    return <p className="post-list-content" role="alert">手记读取失败。<a href={href}>重试</a></p>;
  }
  if (!note) notFound();
  // Core 对加密手记返回 403，标题也拿不到；输入密码后由服务端函数带密码读取正文。
  if (note.locked) {
    return (
      <article className="post-detail">
        <header className="page-heading">
          <Link href="/notes">返回手记列表</Link>
          <h1 className="post-detail-title">加密手记</h1>
        </header>
        <div className="post-list-content">
          <NoteUnlock nid={Number(rawNid)} />
        </div>
      </article>
    );
  }

  const ai = await loadArticleAi(note.id, (await searchParams)?.lang);
  const body = ai.translation ?? note;
  return (
    <article className="post-detail note-detail" lang={ai.lang ?? undefined}>
      <ArticleNotifications id={note.id} />
      <header className="page-heading">
        <Link href="/notes">返回手记列表</Link>
        <h1 className="post-detail-title">{body.title}</h1>
        <div className="post-meta">
          <time dateTime={note.created}>{formatDate(note.created)}</time>
          {note.topic && <span>{note.topic}</span>}
          {note.mood && <span>心情：{note.mood}</span>}
          {note.weather && <span>天气：{note.weather}</span>}
          <ArticleStats apiUrl={getApiUrl()} id={note.id} type="note" read={note.count.read} like={note.count.like} />
          <ReadingCount apiUrl={getApiUrl()} id={note.id} />
        </div>
        <ArticleLanguages href={href} ai={ai} />
      </header>
      <div className="post-list-content">
        <ArticleAiNotes ai={ai} />
        <ArticleBody text={body.text} contentFormat={body.contentFormat} content={body.content} emptyText="这篇手记暂时没有可展示的正文。" variant="note" />
        {(note.newer || note.older) && (
          <nav className="post-pagination" aria-label="相邻手记">
            {note.newer ? <Link href={`/notes/${note.newer.nid}`}>较新：{note.newer.title}</Link> : <span />}
            {note.older ? <Link href={`/notes/${note.older.nid}`}>较早：{note.older.title}</Link> : <span />}
          </nav>
        )}
        <Suspense fallback={<p className="post-meta" role="status">正在读取评论…</p>}>
          <Comments refId={note.id} refType="Note" allowComment={note.allowComment} />
        </Suspense>
      </div>
    </article>
  );
}
