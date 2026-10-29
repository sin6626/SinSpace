import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getMurmurs, getNotes, getPosts } from "../lib/blog-data";
import { murmurImageSources } from "../lib/murmur";
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
      {allHref && <Link className="home-section-more" href={allHref}>全部<ArrowRight size={14} aria-hidden="true" /></Link>}
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

// 竖向时间线的一条：前面一颗小星，标题在左，附加信息和日期靠右；整条可点。
function TimelineItem({ href, created, title, meta, serif, pinned }: {
  href: string | null;
  created: string;
  title: string;
  meta?: ReactNode;
  serif?: boolean;
  pinned?: boolean;
}) {
  return (
    <li className={pinned ? "home-timeline-item is-pinned" : "home-timeline-item"}>
      <span className="home-timeline-node" aria-hidden="true" />
      <span className={serif ? "home-timeline-title is-serif" : "home-timeline-title"}>
        {href ? <Link className="card-link" href={href}>{title}</Link> : title}
      </span>
      <span className="home-timeline-meta">
        {meta}
        <time dateTime={created}>{formatDate(created)}</time>
      </span>
    </li>
  );
}

// 首屏下面：左栏上下放文章和手记；右栏按 2:3 上下分成碎碎念和“最近发生的事”；两栏下面是技术栈滚动条。
export default async function HomeLatest() {
  const [posts, notes, murmurs] = await Promise.all([
    load(async () => (await getPosts(1)).data.slice(0, 5)),
    load(async () => (await getNotes(1)).data.slice(0, 5)),
    load(async () => (await getMurmurs(1)).data.slice(0, 6)),
  ]);
  return (
    <div className="home-columns">
      <div className="home-main">
        <Section title="文章" note="学到的、想明白的" allHref="/posts" items={posts} empty="还没有已发布的文章。">
          {(items) => (
            <ol className="home-timeline">
              {items.map((post) => (
                <TimelineItem
                  key={post.id}
                  href={postHref(post)}
                  created={post.created}
                  title={post.title}
                  pinned={post.pinned}
                  meta={<>{post.pinned && <span className="badge">置顶</span>}{post.category && <span>{post.category.name}</span>}</>}
                />
              ))}
            </ol>
          )}
        </Section>
        <Section title="手记" note="写给自己的心里话" allHref="/notes" items={notes} empty="还没有公开的手记。">
          {(items) => (
            <ol className="home-timeline">
              {items.map((note) => (
                <TimelineItem
                  key={note.id}
                  href={`/notes/${note.nid}`}
                  created={note.created}
                  title={note.title}
                  serif
                  meta={<span>{[note.mood, note.weather].filter(Boolean).join(" · ") || note.topic}</span>}
                />
              ))}
            </ol>
          )}
        </Section>
      </div>
      <aside className="home-side">
        <Section title="碎碎念" note="随口说的闲话" allHref="/murmurs" items={murmurs} empty="今晚还没有碎碎念。" className="home-side-murmurs">
          {(items) => (
            <ul className="home-murmurs">
              {items.map((item) => {
                const images = murmurImageSources(item.content);
                const text = excerpt(item.content, 140);
                return (
                  <li key={item.id}>
                    <time dateTime={item.created}>{formatDate(item.created)}</time>
                    {text && <p>{text}</p>}
                    {images.length > 0 && (
                      <div className="home-murmur-thumbs" aria-label={`${images.length} 张图`}>
                        {images.slice(0, 3).map((src) => (
                          // eslint-disable-next-line @next/next/no-img-element -- 图床上的缩略预览
                          <img key={src} src={src} alt="" loading="lazy" />
                        ))}
                        {images.length > 3 && <span>+{images.length - 3}</span>}
                      </div>
                    )}
                  </li>
                );
              })}
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
