import type { CategoryModel } from "@mx-space/api-client";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { getCategories, getPosts } from "../lib/blog-data";
import { formatDate } from "../lib/date";

type PostListProps = {
  searchParams: Promise<{ page?: string | string[] }>;
  params?: Promise<{ slug: string }>;
};

export default async function PostList({ searchParams, params }: PostListProps) {
  const [{ page: rawPage = "1" }, route] = await Promise.all([searchParams, params]);
  if (typeof rawPage !== "string" || !/^[1-9]\d*$/.test(rawPage)) notFound();
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page)) notFound();
  let slug: string | undefined;
  try {
    slug = route ? decodeURIComponent(route.slug) : undefined;
  } catch {
    notFound();
  }
  const base = slug === undefined ? "/posts" : `/categories/${encodeURIComponent(slug)}`;
  const pageHref = (number: number) => number === 1 ? base : `${base}?page=${number}`;

  let categories: CategoryModel[];
  let category: CategoryModel | undefined;
  let result: Awaited<ReturnType<typeof getPosts>>;
  try {
    categories = await getCategories();
    category = route ? categories.find((item) => item.slug === slug) : undefined;
    if (route && !category) notFound();
    result = await getPosts(page, category?.id);
    if (page > Math.max(1, result.pagination.totalPage)) notFound();
  } catch (error) {
    unstable_rethrow(error);
    return <p className="post-list-content" role="alert">文章读取失败。<a href={pageHref(page)}>重试</a></p>;
  }
  const { data: posts, pagination } = result;

  return (
    <>
      <header className="page-heading">
        <h1>{category?.name ?? "文章"}</h1>
        <p className="post-meta">共 {pagination.total} 篇文章</p>
      </header>
      <div className="post-list-content">
        <nav className="post-categories" aria-label="文章分类">
          <Link href="/posts" aria-current={!category ? "page" : undefined}>全部文章</Link>
          {categories.map((item) => (
            <Link key={item.id} href={`/categories/${encodeURIComponent(item.slug)}`} aria-current={item.id === category?.id ? "page" : undefined}>
              {item.name}
            </Link>
          ))}
        </nav>
        {posts.length ? (
          <ul className="post-list">
            {posts.map((post) => (
              <li key={post.id}>
                <article>
                  <h2>{post.category && post.slug ? (
                    <Link href={`/posts/${encodeURIComponent(post.category.slug)}/${encodeURIComponent(post.slug)}`}>{post.title}</Link>
                  ) : post.title}</h2>
                  <div className="post-meta">
                    {post.pinned && <span>置顶</span>}
                    <time dateTime={post.created}>
                      {formatDate(post.created)}
                    </time>
                    {post.category ? (
                      <Link href={`/categories/${encodeURIComponent(post.category.slug)}`}>{post.category.name}</Link>
                    ) : <span>未分类</span>}
                  </div>
                  {post.summary && <p className="post-summary">{post.summary}</p>}
                </article>
              </li>
            ))}
          </ul>
        ) : <p className="post-empty">{category ? "这个分类下还没有已发布的文章。" : "还没有已发布的文章。"}</p>}
        {pagination.totalPage > 1 && (
          <nav className="post-pagination" aria-label="文章分页">
            {pagination.hasPrevPage ? <Link href={pageHref(page - 1)} rel="prev">上一页</Link> : <span>上一页</span>}
            <span>第 {page} / {pagination.totalPage} 页</span>
            {pagination.hasNextPage ? <Link href={pageHref(page + 1)} rel="next">下一页</Link> : <span>下一页</span>}
          </nav>
        )}
      </div>
    </>
  );
}
