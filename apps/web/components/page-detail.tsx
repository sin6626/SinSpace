import { notFound, unstable_rethrow } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPage } from "../lib/blog-data";
import "./post-detail.css";

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
        {page.contentFormat === "lexical" && <p className="post-meta">此页面目前以简化阅读版展示，部分扩展内容暂不支持。</p>}
        {typeof page.text === "string" ? (
          <div className="article-body">
            <Markdown remarkPlugins={[remarkGfm]} skipHtml>{page.text}</Markdown>
          </div>
        ) : <p role="status">这个页面暂时没有可展示的正文。</p>}
      </div>
    </article>
  );
}
