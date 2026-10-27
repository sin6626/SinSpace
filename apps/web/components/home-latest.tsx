import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getNotes, getPosts, getRecently } from "../lib/blog-data";
import { formatDate } from "../lib/date";
import { excerpt } from "../lib/excerpt";
import { postHref } from "./post-list";
import RecentActivityList from "./recent-activity";
import TechStack from "./tech-stack";
import "./corners.css";

// 各块分别读取，一块失败不影响其他块。
async function load<T>(read: () => Promise<T>) {
  try {
    return await read();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

function Heading({ title, note, allHref }: { title: string; note: string; allHref?: string }) {
  return (
    <div className="home-section-heading">
      <h2>{title}</h2>
      <p>{note}</p>
      {allHref && <Link href={allHref}>全部 →</Link>}
    </div>
  );
}

function Section<T>({ title, note, allHref, items, empty, className, children }: {
  title: string;
  note: string;
  allHref: string;
  items: T[] | null;
  empty: string;
  className?: string;
  children: (items: T[]) => ReactNode;
}) {
  return (
    <section className={className ? `home-section ${className}` : "home-section"} aria-label={title}>
      <Heading title={title} note={note} allHref={allHref} />
      {items === null ? (
        <p className="post-empty" role="alert">{title}读取失败，请稍后刷新。</p>
      ) : items.length ? children(items) : <p className="post-empty">{empty}</p>}
    </section>
  );
}

// 表格般对齐的一行：日期 | 标题 | 右侧附加信息，不画边框，整行可点。
function Row({ href, created, title, extra, serif }: { href: string | null; created: string; title: string; extra?: ReactNode; serif?: boolean }) {
  return (
    <li className="home-row">
      <time dateTime={created}>{formatDate(created)}</time>
      <span className={serif ? "home-row-title is-serif" : "home-row-title"}>
        {href ? <Link className="card-link" href={href}>{title}</Link> : title}
      </span>
      {extra && <span className="home-row-extra">{extra}</span>}
    </li>
  );
}

// 首屏下面：左栏上下放文章和手记；右栏按 3:7 上下分成碎碎念和“最近发生的事”；两栏下面是技术栈滚动条。
export default async function HomeLatest() {
  const [posts, notes, murmurs] = await Promise.all([
    load(async () => (await getPosts(1)).data.slice(0, 6)),
    load(async () => (await getNotes(1)).data.slice(0, 5)),
    load(async () => (await getRecently()).data.slice(0, 6)),
  ]);
  return (
    <div className="home-columns">
      <div className="home-main">
        <Section title="文章" note="学到的、想明白的" allHref="/posts" items={posts} empty="还没有已发布的文章。">
          {(items) => (
            <ul className="home-rows">
              {items.map((post) => (
                <Row
                  key={post.id}
                  href={postHref(post)}
                  created={post.created}
                  title={post.title}
                  extra={<>{post.pinned && <span className="badge">置顶</span>}{post.category?.name}</>}
                />
              ))}
            </ul>
          )}
        </Section>
        <Section title="手记" note="写给自己的心里话" allHref="/notes" items={notes} empty="还没有公开的手记。">
          {(items) => (
            <ul className="home-rows">
              {items.map((note) => (
                <Row
                  key={note.id}
                  href={`/notes/${note.nid}`}
                  created={note.created}
                  title={note.title}
                  serif
                  extra={[note.mood, note.weather].filter(Boolean).join(" · ") || note.topic}
                />
              ))}
            </ul>
          )}
        </Section>
      </div>
      <aside className="home-side">
        <Section title="碎碎念" note="平日里的小事" allHref="/thinking" items={murmurs} empty="今晚还没有碎碎念。" className="home-side-murmurs">
          {(items) => (
            <ul className="home-murmurs">
              {items.map((item) => (
                <li key={item.id}>
                  <time dateTime={item.created}>{formatDate(item.created)}</time>
                  <p>{excerpt(item.content, 140)}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <section className="home-section home-side-activity" aria-label="最近发生的事">
          <Heading title="最近发生的事" note="评论、点赞与更新" />
          <Suspense fallback={<p className="post-empty" role="status">正在读取…</p>}>
            <RecentActivityList />
          </Suspense>
        </section>
      </aside>
      <TechStack />
    </div>
  );
}
