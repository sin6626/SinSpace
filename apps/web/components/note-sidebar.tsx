import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { getTopics } from "../lib/blog-data";
import SidebarSearch from "./sidebar-search";
import "./details-sidebar.css";

export default async function NoteSidebar({ keyword = "", activeTopic }: { keyword?: string; activeTopic?: string }) {
  let topics: Awaited<ReturnType<typeof getTopics>> | null = null;
  try {
    topics = await getTopics();
  } catch (error) {
    unstable_rethrow(error);
  }
  return (
    <>
      <SidebarSearch action="/notes" label="搜索手记" defaultValue={keyword} />
      <section className="details-section" aria-labelledby="note-topics-heading">
        <h2 id="note-topics-heading">话题</h2>
        {topics === null ? <p className="details-message" role="alert">话题读取失败。</p> : topics.length ? (
          <ul className="tag-list">
            {topics.map((topic) => (
              <li key={topic.id}>
                <Link className="tag-chip" href={`/notes?topic=${encodeURIComponent(topic.slug)}`} aria-current={topic.slug === activeTopic ? "page" : undefined}>
                  {topic.name}<span className="tag-count">{topic.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="details-message">暂无话题。</p>}
      </section>
    </>
  );
}
