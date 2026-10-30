import { notFound, unstable_rethrow } from "next/navigation";
import { getPage } from "../lib/blog-data";
import ArticleBody from "./article-body";
import IslandReading from "./island-reading";
import ArticleAside from "./article-aside";
import "./post-detail.css";
import { Suspense } from "react";
import Comments from "./comments";
import { getT } from "../lib/i18n/server";
import LoadError from "./load-error";

// 后台“页面”（如关于我、关于本站），地址是 /<slug>。
export default async function PageDetail({ params }: { params: Promise<{ slug: string }> }) {
  const route = await params;
  const t = await getT();
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
    return <LoadError what={t.pages.title} href={`/${slug}`} />;
  }
  if (!page) notFound();

  return (
    <article className="post-detail">
      <IslandReading title={page.title} kind="page" />
      <header className="page-heading">
        <h1>{page.title}</h1>
        {page.subtitle && <p className="post-meta">{page.subtitle}</p>}
      </header>
      <div className="post-list-content">
        <ArticleBody text={page.text} contentFormat={page.contentFormat} content={page.content} emptyText={t.pages.noBody} />
        <Suspense fallback={<p className="post-meta" role="status">{t.list.loadingComments}</p>}>
          <Comments refId={page.id} refType="Page" allowComment={page.allowComment} />
        </Suspense>
      </div>
      {/* 右侧悬浮栏：目录 + 操作（喜欢、分享、订阅、回到顶部），宽屏悬浮在正文右侧留白里，窄屏隐藏 */}
      <ArticleAside title={page.title} comments={{ refId: page.id, refType: "Page", allowComment: page.allowComment }} />
    </article>
  );
}
