import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { getCategories, getRecently } from "../lib/blog-data";
import { formatDate } from "../lib/date";
import ArticleBody from "./article-body";

type Item = Awaited<ReturnType<typeof getRecently>>["data"][number];

// 引用的文章需要分类 slug 才能拼出地址，Core 只给了分类 id，用分类列表换算。
function refHref(ref: NonNullable<Item["ref"]>, categories: { id: string; slug: string }[]) {
  if (ref.type === "Note" && ref.nid) return `/notes/${ref.nid}`;
  if (ref.type === "Page" && ref.slug) return `/${encodeURIComponent(ref.slug)}`;
  const category = categories.find((item) => item.id === ref.categoryId);
  if (ref.type === "Post" && ref.slug && category) return `/posts/${encodeURIComponent(category.slug)}/${encodeURIComponent(ref.slug)}`;
  return null;
}

// 思考（Core 的“动态”）：正文按 Markdown 显示，附带引用的文章/手记/页面。点赞、评论暂未做。
export default async function ThinkingList({ searchParams }: { searchParams: Promise<{ before?: string | string[] }> }) {
  const { before } = await searchParams;
  if (before !== undefined && (typeof before !== "string" || !/^[a-f\d]{24}$/i.test(before))) notFound();
  let result: Awaited<ReturnType<typeof getRecently>>;
  let categories: Awaited<ReturnType<typeof getCategories>>;
  try {
    [result, categories] = await Promise.all([getRecently(before), getCategories()]);
  } catch (error) {
    unstable_rethrow(error);
    return <p className="post-list-content" role="alert">思考读取失败。<a href={before ? `/thinking?before=${before}` : "/thinking"}>重试</a></p>;
  }
  if (before && !result.data.length) notFound();
  const last = result.data.at(-1);

  return (
    <>
      <header className="page-heading">
        <h1>思考</h1>
      </header>
      <div className="post-list-content">
        {result.data.length ? (
          <ul className="post-list">
            {result.data.map((item) => {
              const href = item.ref && refHref(item.ref, categories);
              return (
                <li key={item.id}>
                  <ArticleBody text={item.content} emptyText="" />
                  <p className="post-meta">
                    <time dateTime={item.created}>{formatDate(item.created)}</time>
                    {item.ref && (href ? <Link href={href}>引用：{item.ref.title}</Link> : <span>引用：{item.ref.title}</span>)}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : <p className="post-empty">还没有思考。</p>}
        {(before || (result.hasMore && last)) && (
          <nav className="post-pagination" aria-label="思考分页">
            {before ? <Link href="/thinking">回到最新</Link> : <span />}
            {result.hasMore && last ? <Link href={`/thinking?before=${last.id}`} rel="next">更早</Link> : <span />}
          </nav>
        )}
      </div>
    </>
  );
}
