import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { getTopics } from "../lib/blog-data";
import SidebarSearch from "./sidebar-search";
import "./details-sidebar.css";

// 手记列表顶部的筛选：搜索框 + 收起的话题（选中某个话题时自动展开）。
export default async function NoteSidebar({ keyword = "", activeTopic }: { keyword?: string; activeTopic?: string }) {
  let topics: Awaited<ReturnType<typeof getTopics>> | null = null;
  try {
    topics = await getTopics();
  } catch (error) {
    unstable_rethrow(error);
  }
  return (
    <div className="list-toolbar">
      <SidebarSearch action="/notes" label="搜索手记" defaultValue={keyword} />
      <details className="tag-drawer" open={Boolean(activeTopic)}>
        <summary>按话题筛选{topics?.length ? <span className="tag-count">{topics.length}</span> : null}</summary>
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
      </details>
    </div>
  );
}
