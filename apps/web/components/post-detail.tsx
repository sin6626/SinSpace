import { ArticleNotifications, ReadingCount } from "./notifications";
import IslandReading from "./island-reading";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { getPost, getTimeline } from "../lib/blog-data";
import { formatDate } from "../lib/date";
import { getApiUrl } from "../lib/config";
import ArticleBody from "./article-body";
import ArticleToc from "./article-toc";
import { ArticleAiNotes, ArticleLanguages, loadArticleAi } from "./article-ai";
import ArticleStats from "./article-stats";
import "./post-detail.css";
import { Suspense } from "react";
import Comments from "./comments";

export default async function PostDetail({ params, searchParams }: {
  params: Promise<{ category: string; slug: string }>;
  searchParams?: Promise<{ lang?: string | string[] }>;
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
  const ai = await loadArticleAi(post.id, (await searchParams)?.lang);
  const body = ai.translation ?? post;

  return (
    <article className="post-detail" lang={ai.lang ?? undefined}>
      <ArticleNotifications id={post.id} />
      <IslandReading title={body.title} kind="文章" />
      <header className="page-heading">
        <nav className="detail-crumb" aria-label="位置">
          <Link href="/posts">文章</Link>
          {post.category && <><span aria-hidden="true">/</span><Link href={`/categories/${encodeURIComponent(post.category.slug)}`}>{post.category.name}</Link></>}
        </nav>
        <h1 className="post-detail-title">{body.title}</h1>
        <div className="post-meta detail-meta">
          <time dateTime={post.created}>{formatDate(post.created)}</time>
          <span>阅读 {post.count.read}</span>
          <ReadingCount apiUrl={getApiUrl()} id={post.id} />
          <ArticleLanguages href={href} ai={ai} />
        </div>
      </header>
      <div className="post-list-content">
        <ArticleAiNotes ai={ai} />
        <ArticleBody text={body.text} contentFormat={body.contentFormat} content={body.content} emptyText="这篇文章暂时没有可展示的正文。" />
        <div className="article-end"><ArticleStats apiUrl={getApiUrl()} id={post.id} type="post" like={post.count.like} /></div>
        <Suspense fallback={null}>
          <PostNeighbors id={post.id} />
        </Suspense>
        <Suspense fallback={<p className="post-meta" role="status">正在读取评论…</p>}>
          <Comments refId={post.id} refType="Post" allowComment={post.allowComment} />
        </Suspense>
      </div>
      {/* 文章目录：宽屏悬浮在正文右侧留白里，窄屏隐藏（globals.css 的 .site-details） */}
      <aside className="site-details" aria-label="文章目录"><ArticleToc /></aside>
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
    <nav className="neighbor-nav" aria-label="相邻文章">
      {newer ? <Link href={href(newer)}><span className="neighbor-label"><ArrowLeft size={14} aria-hidden="true" />较新</span><span className="neighbor-title">{newer.title}</span></Link> : <span />}
      {older ? <Link className="is-older" href={href(older)}><span className="neighbor-label">较早<ArrowRight size={14} aria-hidden="true" /></span><span className="neighbor-title">{older.title}</span></Link> : <span />}
    </nav>
  );
}
