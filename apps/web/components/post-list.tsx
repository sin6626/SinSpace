import type { CategoryModel } from "@mx-space/api-client";
import Link from "./locale-provider";
import { notFound, unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { getCategories, getPosts } from "../lib/blog-data";
import { readText } from "../lib/search-params";
import { PostSearch, PostsByTag } from "./post-filter";
import PostTagDrawer from "./post-sidebar";
import type { ListExcerpt } from "../lib/blog-data";
import Entry, { EntryTag, type EntryStats } from "./entry";
import SidebarSearch from "./sidebar-search";
import "./details-sidebar.css";
import "./corners.css";
import { getT } from "../lib/i18n/server";
import LoadError from "./load-error";

type PostListProps = {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[]; tag?: string | string[] }>;
  params?: Promise<{ slug: string }>;
};

export type PostCardData = {
  id: string;
  href: string | null;
  title: string;
  summary?: string | null;
  excerpt?: ListExcerpt;
  stats?: EntryStats;
  tags?: string[];
  created: string;
  pinned?: boolean;
  category: { name: string; slug: string } | null;
};

// 文章的角落：标题 + 摘要 + 日期和分类，整张卡片可点（分类链接仍可单独点）。首页预览复用。
export async function PostCard({ post, headingLevel = 2 }: { post: PostCardData; headingLevel?: 2 | 3 }) {
  const { posts: t, list } = await getT();
  return (
    <Entry
      href={post.href}
      title={post.title}
      created={post.created}
      headingLevel={headingLevel}
      excerpt={post.excerpt ?? post.summary}
      stats={post.stats}
      hashtags={post.tags}
      tags={<>
        {post.category
          ? <EntryTag href={`/categories/${encodeURIComponent(post.category.slug)}`}>{post.category.name}</EntryTag>
          : <EntryTag>{t.uncategorized}</EntryTag>}
        {post.pinned && <span className="badge">{list.pinned}</span>}
      </>}
    />
  );
}

export const postHref = (post: { slug?: string; category: { slug: string } | null }) =>
  post.category && post.slug ? `/posts/${encodeURIComponent(post.category.slug)}/${encodeURIComponent(post.slug)}` : null;

export default async function PostList({ searchParams, params }: PostListProps) {
  const [{ page: rawPage = "1", q, tag }, route, { posts: t, list }] = await Promise.all([searchParams, params, getT()]);
  const keyword = route ? "" : readText(q);
  const activeTag = !route && typeof tag === "string" && tag.trim() ? tag.slice(0, 100) : undefined;
  // 搜索框放在标题右边；标签抽屉要读接口，单独 Suspense，不挡住列表。
  const search = <SidebarSearch action="/posts" label={t.search} defaultValue={keyword} />;
  const tags = <Suspense fallback={null}><PostTagDrawer activeTag={activeTag} /></Suspense>;
  // 搜索和标签只作用于 /posts；标签名原样保留（后台有带空格的标签）。
  if (keyword) return <PostSearch keyword={keyword} search={search} filters={tags} />;
  if (activeTag) return <PostsByTag name={activeTag} search={search} filters={tags} />;
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
    return <LoadError what={t.title} href={pageHref(page)} />;
  }
  const { data: posts, pagination } = result;

  return (
    <>
      <header className="page-heading list-heading">
        <div>
          <h1>{category?.name ?? t.title}</h1>
          <p className="post-meta">{t.count(pagination.total)}</p>
        </div>
        {search}
      </header>
      <div className="post-list-content">
        <div className="list-filters">
        <nav className="post-categories" aria-label={t.categories}>
          <Link href="/posts" aria-current={!category ? "page" : undefined}>{t.all}</Link>
          {categories.map((item) => (
            <Link key={item.id} href={`/categories/${encodeURIComponent(item.slug)}`} aria-current={item.id === category?.id ? "page" : undefined}>
              {item.name}
            </Link>
          ))}
        </nav>
        {tags}
        </div>
        {posts.length ? (
          <ul className="post-list">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={{ ...post, href: postHref(post) }} />
              </li>
            ))}
          </ul>
        ) : <p className="post-empty">{category ? t.emptyCategory : t.empty}</p>}
        {pagination.totalPage > 1 && (
          <nav className="post-pagination" aria-label={list.pagination(t.title)}>
            {pagination.hasPrevPage ? <Link href={pageHref(page - 1)} rel="prev">{list.prev}</Link> : <span>{list.prev}</span>}
            <span>{list.page(page, pagination.totalPage)}</span>
            {pagination.hasNextPage ? <Link href={pageHref(page + 1)} rel="next">{list.next}</Link> : <span>{list.next}</span>}
          </nav>
        )}
      </div>
    </>
  );
}
