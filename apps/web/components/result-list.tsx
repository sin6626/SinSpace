import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate } from "../lib/date";

export type ResultItem = { key: string; href: string; title: string; created: string; meta?: string };

// 搜索与标签/话题筛选的结果列表，文章和手记共用。
export default function ResultList({ title, summary, items, emptyText, toolbar }: {
  title: string;
  summary: string;
  items: ResultItem[] | null;
  emptyText: string;
  toolbar?: ReactNode;
}) {
  return (
    <>
      <header className="page-heading">
        <h1>{title}</h1>
        {summary && <p className="post-meta">{summary}</p>}
      </header>
      <div className="post-list-content">
        {toolbar}
        {items === null ? (
          <p className="post-empty" role="alert">读取失败，请稍后重试。</p>
        ) : items.length ? (
          <ul className="post-list">
            {items.map((item) => (
              <li key={item.key}>
                <article className="post-card">
                  <h2><Link href={item.href}>{item.title}</Link></h2>
                  <div className="post-meta">
                    <time dateTime={item.created}>{formatDate(item.created)}</time>
                    {item.meta && <span>{item.meta}</span>}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        ) : <p className="post-empty">{emptyText}</p>}
      </div>
    </>
  );
}
