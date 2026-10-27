import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";
import { getNotes, getPosts, getProjects, getRecently } from "../lib/blog-data";
import { formatDate } from "../lib/date";
import { excerpt } from "../lib/excerpt";
import { NoteEntry } from "./note-list";
import { PostCard, postHref } from "./post-list";
import { ProjectCard } from "./project-list";
import "./corners.css";

// 四块分别读取，一块失败不影响其他块。
async function load<T>(read: () => Promise<T>) {
  try {
    return await read();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

function Section<T>({ title, note, allHref, items, empty, children }: {
  title: string;
  note: string;
  allHref: string;
  items: T[] | null;
  empty: string;
  children: (items: T[]) => ReactNode;
}) {
  return (
    <section className="home-section" aria-label={title}>
      <div className="home-section-heading">
        <h2>{title}</h2>
        <p>{note}</p>
        <Link href={allHref}>全部 →</Link>
      </div>
      {items === null ? (
        <p className="post-empty" role="alert">{title}读取失败，请稍后刷新。</p>
      ) : items.length ? children(items) : <p className="post-empty">{empty}</p>}
    </section>
  );
}

// 阳台下面的“屋里”：space 的四个角落各放几条最新的，顺序是碎碎念、手记、文章、作品。
export default async function HomeLatest() {
  const [murmurs, notes, posts, projects] = await Promise.all([
    load(async () => (await getRecently()).data.slice(0, 3)),
    load(async () => (await getNotes(1)).data.slice(0, 3)),
    load(async () => (await getPosts(1)).data.slice(0, 3)),
    load(async () => (await getProjects()).slice(0, 4)),
  ]);
  return (
    <div className="post-list-content">
      <Section title="碎碎念" note="平日里的小事和小快乐" allHref="/thinking" items={murmurs} empty="今晚还没有碎碎念。">
        {(items) => (
          <ul className="murmur-preview">
            {items.map((item) => (
              <li key={item.id}>
                <p>{excerpt(item.content, 120)}</p>
                <time dateTime={item.created}>{formatDate(item.created)}</time>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="手记" note="写给自己的心里话" allHref="/notes" items={notes} empty="还没有公开的手记。">
        {(items) => <ul className="note-list">{items.map((note) => <li key={note.id}><NoteEntry note={note} headingLevel={3} /></li>)}</ul>}
      </Section>
      <Section title="文章" note="学到的、想明白的" allHref="/posts" items={posts} empty="还没有已发布的文章。">
        {(items) => <ul className="post-list">{items.map((post) => <li key={post.id}><PostCard post={{ ...post, href: postHref(post) }} headingLevel={3} /></li>)}</ul>}
      </Section>
      <Section title="作品" note="亲手做出来的东西" allHref="/projects" items={projects} empty="还没有作品。">
        {(items) => <ul className="project-grid">{items.map((project) => <li key={project.id}><ProjectCard project={project} headingLevel={3} /></li>)}</ul>}
      </Section>
    </div>
  );
}
