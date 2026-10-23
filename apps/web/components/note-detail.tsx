import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getNote } from "../lib/blog-data";
import { formatDate } from "../lib/date";
import "./post-detail.css";

function httpStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
}

export default async function NoteDetail({ params }: { params: Promise<{ nid: string }> }) {
  const { nid: rawNid } = await params;
  if (!/^[1-9]\d*$/.test(rawNid) || !Number.isSafeInteger(Number(rawNid))) notFound();
  const href = `/notes/${rawNid}`;
  let note: Awaited<ReturnType<typeof getNote>>;
  try {
    note = await getNote(Number(rawNid));
  } catch (error) {
    unstable_rethrow(error);
    const status = httpStatus(error);
    if (status === 404) notFound();
    // Core 对设置了密码的手记返回 403；新前端暂不提供密码输入。
    if (status === 403) return <p className="post-list-content" role="status">这篇手记设置了访问密码，暂不支持在这里查看。<Link href="/notes">返回手记列表</Link></p>;
    return <p className="post-list-content" role="alert">手记读取失败。<a href={href}>重试</a></p>;
  }

  return (
    <article className="post-detail">
      <header className="page-heading">
        <Link href="/notes">返回手记列表</Link>
        <h1 className="post-detail-title">{note.title}</h1>
        <div className="post-meta">
          <time dateTime={note.created}>{formatDate(note.created)}</time>
          {note.topic && <span>{note.topic}</span>}
          {note.mood && <span>心情：{note.mood}</span>}
          {note.weather && <span>天气：{note.weather}</span>}
        </div>
      </header>
      <div className="post-list-content">
        {note.contentFormat === "lexical" && <p className="post-meta">此手记目前以简化阅读版展示，部分扩展内容暂不支持。</p>}
        {typeof note.text === "string" ? (
          <div className="article-body">
            <Markdown remarkPlugins={[remarkGfm]} skipHtml>{note.text}</Markdown>
          </div>
        ) : <p role="status">这篇手记暂时没有可展示的正文。</p>}
        {(note.newer || note.older) && (
          <nav className="post-pagination" aria-label="相邻手记">
            {note.newer ? <Link href={`/notes/${note.newer.nid}`}>较新：{note.newer.title}</Link> : <span />}
            {note.older ? <Link href={`/notes/${note.older.nid}`}>较早：{note.older.title}</Link> : <span />}
          </nav>
        )}
      </div>
    </article>
  );
}
