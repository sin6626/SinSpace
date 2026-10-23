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
            {topics.map((topic) => {
              // 已选中的话题再点一次回到完整列表。
              const active = topic.slug === activeTopic;
              return (
                <li key={topic.id}>
                  <Link
                    className="tag-chip"
                    href={active ? "/notes" : `/notes?topic=${encodeURIComponent(topic.slug)}`}
                    aria-current={active ? "page" : undefined}
                    title={active ? "再次点击取消筛选" : undefined}
                  >
                    {topic.name}<span className="tag-count">{topic.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : <p className="details-message">暂无话题。</p>}
      </section>
    </>
  );
}
