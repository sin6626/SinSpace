import { ArticleNotifications } from "./notifications";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPost } from "../lib/blog-data";
import { formatDate } from "../lib/date";
import "./post-detail.css";

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
        </div>
      </header>
      <div className="post-list-content">
        {post.contentFormat === "lexical" && <p className="post-meta">此文章目前以简化阅读版展示，部分扩展内容暂不支持。</p>}
        {typeof post.text === "string" ? (
          <div className="article-body">
            <Markdown remarkPlugins={[remarkGfm]} skipHtml>{post.text}</Markdown>
          </div>
        ) : <p role="status">这篇文章暂时没有可展示的正文。</p>}
      </div>
    </article>
  );
}
