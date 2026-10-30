import type { ReactNode } from "react";
import Entry, { EntryTag } from "./entry";
import { getT } from "../lib/i18n/server";

export type ResultItem = { key: string; href: string; title: string; created: string; meta?: string };

// 搜索与标签/话题筛选的结果列表，文章和手记共用。
export default async function ResultList({ title, summary, items, emptyText, search, filters }: {
  title: string;
  summary: string;
  items: ResultItem[] | null;
  emptyText: string;
  search?: ReactNode;
  filters?: ReactNode;
}) {
  return (
    <>
      <header className="page-heading list-heading">
        <div>
          <h1>{title}</h1>
          {summary && <p className="post-meta">{summary}</p>}
        </div>
        {search}
      </header>
      <div className="post-list-content">
        {filters && <div className="list-filters">{filters}</div>}
        {items === null ? (
          <p className="post-empty" role="alert">{(await getT()).list.genericFailed}</p>
        ) : items.length ? (
          <ul className="post-list">
            {items.map((item) => (
              <li key={item.key}>
                <Entry href={item.href} title={item.title} created={item.created} tags={item.meta ? <EntryTag>{item.meta}</EntryTag> : undefined} />
              </li>
            ))}
          </ul>
        ) : <p className="post-empty">{emptyText}</p>}
      </div>
    </>
  );
}
