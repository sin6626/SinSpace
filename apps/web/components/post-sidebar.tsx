import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { getTags } from "../lib/blog-data";
import SidebarSearch from "./sidebar-search";
import "./details-sidebar.css";

export default async function PostSidebar({ keyword = "", activeTag }: { keyword?: string; activeTag?: string }) {
  let tags: Awaited<ReturnType<typeof getTags>> | null = null;
  try {
    tags = await getTags();
  } catch (error) {
    unstable_rethrow(error);
  }
  return (
    <>
      <SidebarSearch action="/posts" label="搜索文章" defaultValue={keyword} />
      <section className="details-section" aria-labelledby="post-tags-heading">
        <h2 id="post-tags-heading">标签</h2>
        {tags === null ? <p className="details-message" role="alert">标签读取失败。</p> : tags.length ? (
          <ul className="tag-list">
            {tags.map((tag) => {
              // 已选中的标签再点一次回到完整列表，筛选状态只存在地址栏里。
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
      </section>
    </>
  );
}
