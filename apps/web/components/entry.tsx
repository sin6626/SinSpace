import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate } from "../lib/date";
import "./corners.css";

// 文章、手记、搜索结果共用的列表条目：左栏是大号的“日”和小字“年.月”，右栏第一行标题、标题右边跟分类或话题标签，
// 第二行可选的补充信息（手记的心情、天气），最后最多两行摘要。整条可点（标题链接铺满），标签链接单独可点。
// serif：手记的标题和摘录用衬线字体。
export default function Entry({ href, title, created, tags, meta, excerpt, serif, headingLevel = 2 }: {
  href: string | null;
  title: string;
  created: string;
  tags?: ReactNode;
  meta?: ReactNode;
  excerpt?: string | null;
  serif?: boolean;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const [year, month, day] = formatDate(created).split("/");
  return (
    <article className={serif ? "entry is-serif" : "entry"}>
      <time className="entry-date" dateTime={created}>
        <span className="entry-day">{day}</span>
        <span className="entry-month">{year}.{month}</span>
      </time>
      <div className="entry-body">
        <div className="entry-heading">
          <Heading className="entry-title">{href ? <Link className="card-link" href={href}>{title}</Link> : title}</Heading>
          {tags}
        </div>
        {meta && <div className="post-meta entry-meta">{meta}</div>}
        {excerpt && <p className="entry-excerpt">{excerpt}</p>}
      </div>
    </article>
  );
}

// 标题右边的小标签：有地址时是可单独点的链接
export function EntryTag({ href, children }: { href?: string; children: ReactNode }) {
  return href ? <Link className="entry-tag" href={href}>{children}</Link> : <span className="entry-tag">{children}</span>;
}
