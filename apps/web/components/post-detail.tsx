import { ArticleNotifications } from "./notifications";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { getPost, getTimeline } from "../lib/blog-data";
import { formatDate } from "../lib/date";
import { getApiUrl } from "../lib/config";
import ArticleBody from "./article-body";
import ArticleStats from "./article-stats";
import "./post-detail.css";
import { Suspense } from "react";
import Comments from "./comments";

export default async function PostDetail({ params }: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const route = await params;
  let category: string;
  let slug: string;
  try {
    category = encodeURIComponent(decodeURIComponent(route.category));
    slug = encodeURIComponent(decodeURIComponent(route.slug));
  } catch {
    notFound();
  }
  const href = `/posts/${category}/${slug}`;
  let post: Awaited<ReturnType<typeof getPost>>;
  try {
    post = await getPost(category, slug);
  } catch (error) {
    unstable_rethrow(error);
    return <p className="post-list-content" role="alert">文章读取失败。<a href={href}>重试</a></p>;
  }
  if (!post) notFound();

  return (
    <article className="post-detail">
      <ArticleNotifications id={post.id} />
      <header className="page-heading">
        <Link href="/posts">返回文章列表</Link>
        <h1 className="post-detail-title">{post.title}</h1>
        <div className="post-meta">
          <time dateTime={post.created}>
            {formatDate(post.created)}
          </time>
          {post.category && <Link href={`/categories/${encodeURIComponent(post.category.slug)}`}>{post.category.name}</Link>}
          <ArticleStats apiUrl={getApiUrl()} id={post.id} type="post" read={post.count.read} like={post.count.like} />
        </div>
      </header>
      <div className="post-list-content">
        <ArticleBody text={post.text} contentFormat={post.contentFormat} content={post.content} emptyText="这篇文章暂时没有可展示的正文。" />
        <Suspense fallback={null}>
          <PostNeighbors id={post.id} />
        </Suspense>
        <Suspense fallback={<p className="post-meta" role="status">正在读取评论…</p>}>
          <Comments refId={post.id} refType="Post" allowComment={post.allowComment} />
        </Suspense>
      </div>
    </article>
  );
}

// 相邻文章：复用时间线缓存（全部已发布文章按发布时间倒序），读取失败时不显示。
async function PostNeighbors({ id }: { id: string }) {
  const posts = await getTimeline().then((items) => items.flatMap((item) => item.kind === "post" ? [item] : []), () => []);
  const index = posts.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const href = (item: (typeof posts)[number]) => `/posts/${encodeURIComponent(item.category.slug)}/${encodeURIComponent(item.slug)}`;
  const newer = posts[index - 1];
  const older = posts[index + 1];
  if (!newer && !older) return null;
  return (
    <nav className="post-pagination" aria-label="相邻文章">
      {newer ? <Link href={href(newer)}>较新：{newer.title}</Link> : <span />}
      {older ? <Link href={href(older)}>较早：{older.title}</Link> : <span />}
    </nav>
  );
}
