import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { getNotes, getPosts } from "../lib/blog-data";
import { formatDate } from "../lib/date";

type Item = { key: string; href: string; title: string; created: string; pinned?: boolean };

// 两块分别读取，一块失败不影响另一块。
async function load(read: () => Promise<Item[]>) {
  try {
    return await read();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

function Section({ title, allHref, allLabel, items }: { title: string; allHref: string; allLabel: string; items: Item[] | null }) {
  return (
    <section className="home-section">
      <div className="home-section-heading">
        <h2>{title}</h2>
        <Link href={allHref}>{allLabel}</Link>
      </div>
      {items === null ? (
        <p className="post-empty" role="alert">{title}读取失败，请稍后刷新。</p>
      ) : items.length ? (
        <ul className="post-list">
          {items.map((item) => (
            <li key={item.key}>
              <h3><Link href={item.href}>{item.title}</Link></h3>
              <div className="post-meta">
                {item.pinned && <span>置顶</span>}
                <time dateTime={item.created}>{formatDate(item.created)}</time>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="post-empty">暂无内容。</p>}
    </section>
  );
}

export default async function HomeLatest() {
  const [posts, notes] = await Promise.all([
    load(async () => (await getPosts(1)).data.slice(0, 5).flatMap((post) =>
      post.category && post.slug
        ? [{ key: post.id, href: `/posts/${encodeURIComponent(post.category.slug)}/${encodeURIComponent(post.slug)}`, title: post.title, created: post.created, pinned: post.pinned }]
        : [])),
    load(async () => (await getNotes(1)).data.slice(0, 5).map((note) =>
      ({ key: note.id, href: `/notes/${note.nid}`, title: note.title, created: note.created }))),
  ]);
  return (
    <div className="post-list-content">
      <Section title="最新文章" allHref="/posts" allLabel="全部文章" items={posts} />
      <Section title="最新手记" allHref="/notes" allLabel="全部手记" items={notes} />
    </div>
  );
}
