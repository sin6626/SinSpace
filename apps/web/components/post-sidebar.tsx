import { ChevronDown, Hash } from "lucide-react";
import Link from "./locale-provider";
import { unstable_rethrow } from "next/navigation";
import { getTags } from "../lib/blog-data";
import "./details-sidebar.css";

// 文章列表的标签：默认收起，选中某个标签时自动展开。筛选状态只存在地址栏里。
export default async function PostTagDrawer({ activeTag }: { activeTag?: string }) {
  let tags: Awaited<ReturnType<typeof getTags>> | null = null;
  try {
    tags = await getTags();
  } catch (error) {
    unstable_rethrow(error);
  }
  return (
    <details className="tag-drawer" open={Boolean(activeTag)}>
      <summary><Hash size={14} aria-hidden="true" />按标签{tags?.length ? <span className="tag-count">{tags.length}</span> : null}<ChevronDown className="tag-drawer-arrow" size={14} aria-hidden="true" /></summary>
      {tags === null ? <p className="details-message" role="alert">标签读取失败。</p> : tags.length ? (
        <ul className="tag-list">
          {tags.map((tag) => {
            // 已选中的标签再点一次回到完整列表。
            const active = tag.name === activeTag;
            return (
              <li key={tag.name}>
                <Link
                  className="tag-chip"
                  href={active ? "/posts" : `/posts?tag=${encodeURIComponent(tag.name)}`}
                  aria-current={active ? "page" : undefined}
                  title={active ? "再次点击取消筛选" : undefined}
                >
                  {tag.name.trim()}<span className="tag-count">{tag.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : <p className="details-message">暂无标签。</p>}
    </details>
  );
}
