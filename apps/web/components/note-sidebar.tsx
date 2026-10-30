import { ChevronDown, Hash } from "lucide-react";
import Link from "./locale-provider";
import { unstable_rethrow } from "next/navigation";
import { getTopics } from "../lib/blog-data";
import { getT } from "../lib/i18n/server";
import "./details-sidebar.css";

// 手记列表的话题：默认收起，选中某个话题时自动展开。
export default async function NoteTopicDrawer({ activeTopic }: { activeTopic?: string }) {
  const { notes: t, list } = await getT();
  let topics: Awaited<ReturnType<typeof getTopics>> | null = null;
  try {
    topics = await getTopics();
  } catch (error) {
    unstable_rethrow(error);
  }
  return (
    <details className="tag-drawer" open={Boolean(activeTopic)}>
      <summary><Hash size={14} aria-hidden="true" />{t.byTopic}{topics?.length ? <span className="tag-count">{topics.length}</span> : null}<ChevronDown className="tag-drawer-arrow" size={14} aria-hidden="true" /></summary>
      {topics === null ? <p className="details-message" role="alert">{t.topicsFailed}</p> : topics.length ? (
        <ul className="tag-list">
          {topics.map((topic) => {
            const active = topic.slug === activeTopic;
            return (
              <li key={topic.id}>
                <Link
                  className="tag-chip"
                  href={active ? "/notes" : `/notes?topic=${encodeURIComponent(topic.slug)}`}
                  aria-current={active ? "page" : undefined}
                  title={active ? list.clearFilter : undefined}
                >
                  {topic.name}<span className="tag-count">{topic.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : <p className="details-message">{t.noTopics}</p>}
    </details>
  );
}
