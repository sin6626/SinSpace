import { notFound, unstable_rethrow } from "next/navigation";
import { getPage } from "../lib/blog-data";
import ArticleBody from "./article-body";
import "./post-detail.css";
import { Suspense } from "react";
import Comments from "./comments";

// 后台“页面”（如关于我、关于本站），地址是 /<slug>。
export default async function PageDetail({ params }: { params: Promise<{ slug: string }> }) {
  const route = await params;
  let slug: string;
  try {
    slug = encodeURIComponent(decodeURIComponent(route.slug));
  } catch {
    notFound();
  }
  let page: Awaited<ReturnType<typeof getPage>>;
  try {
    page = await getPage(slug);
  } catch (error) {
    unstable_rethrow(error);
    return <p className="post-list-content" role="alert">页面读取失败。<a href={`/${slug}`}>重试</a></p>;
  }
  if (!page) notFound();

  return (
    <article className="post-detail">
      <header className="page-heading">
        <h1>{page.title}</h1>
        {page.subtitle && <p className="post-meta">{page.subtitle}</p>}
      </header>
      <div className="post-list-content">
        <ArticleBody text={page.text} contentFormat={page.contentFormat} content={page.content} emptyText="这个页面暂时没有可展示的正文。" />
        <Suspense fallback={<p className="post-meta" role="status">正在读取评论…</p>}>
          <Comments refId={page.id} refType="Page" allowComment={page.allowComment} />
        </Suspense>
      </div>
    </article>
  );
}
