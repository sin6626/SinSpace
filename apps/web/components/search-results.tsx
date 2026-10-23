import { Input } from "@base-ui/react/input";
import Form from "next/form";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { searchContent } from "../lib/blog-data";
import { formatDate } from "../lib/date";

type Result = { key: string; href: string; title: string; created: string };
const maxKeywordLength = 50;

function ResultSection({ title, total, items }: { title: string; total: number; items: Result[] }) {
  return (
    <section className="home-section">
      <div className="home-section-heading">
        <h2>{title}</h2>
        <span className="post-meta">共 {total} 条{total > items.length ? `，显示前 ${items.length} 条` : ""}</span>
      </div>
      {items.length ? (
        <ul className="post-list">
          {items.map((item) => (
            <li key={item.key}>
              <h3><Link href={item.href}>{item.title}</Link></h3>
              <div className="post-meta"><time dateTime={item.created}>{formatDate(item.created)}</time></div>
            </li>
          ))}
        </ul>
      ) : <p className="post-empty">没有匹配的{title}。</p>}
    </section>
  );
}

export default async function SearchResults({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const keyword = typeof q === "string" ? q.trim().slice(0, maxKeywordLength) : "";

  let result: Awaited<ReturnType<typeof searchContent>> | null = null;
  let failed = false;
  if (keyword) {
    try {
      result = await searchContent(keyword);
    } catch (error) {
      unstable_rethrow(error);
      failed = true;
    }
  }

  return (
    <div className="post-list-content">
      <Form action="/search" className="search-form" role="search">
        <Input name="q" type="search" defaultValue={keyword} maxLength={maxKeywordLength} placeholder="搜索文章和手记" aria-label="搜索关键词" className="search-input" />
        <button type="submit" className="search-button">搜索</button>
      </Form>
      {!keyword && <p className="post-empty">输入关键词，搜索文章和手记的标题与正文。</p>}
      {failed && <p className="post-empty" role="alert">搜索失败，请稍后重试。</p>}
      {result && (
        <>
          <ResultSection
            title="文章"
            total={result.posts.total}
            items={result.posts.data.flatMap((post) => post.category && post.slug
              ? [{ key: post.id, href: `/posts/${encodeURIComponent(post.category.slug)}/${encodeURIComponent(post.slug)}`, title: post.title, created: post.created }]
              : [])}
          />
          <ResultSection
            title="手记"
            total={result.notes.total}
            items={result.notes.data.map((note) => ({ key: note.id, href: `/notes/${note.nid}`, title: note.title, created: note.created }))}
          />
        </>
      )}
    </div>
  );
}
