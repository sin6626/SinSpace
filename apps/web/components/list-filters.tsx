import { X } from "lucide-react";
import Link from "./locale-provider";
import { getT } from "../lib/i18n/server";

// 文章、手记列表共用：当前筛选（标签或搜索）显示成一枚“标签：Vue ×”，点 × 回到完整列表
export async function ActiveFilter({ label, clearHref }: { label: string; clearHref: string }) {
  const { list } = await getT();
  return (
    <p className="active-filter">
      <span>{label}</span>
      <Link href={clearHref} aria-label={list.removeFilter} title={list.removeFilter}><X size={13} aria-hidden="true" /></Link>
    </p>
  );
}

// 上一页 / 第几页 / 下一页；href 由列表按当前筛选拼好（翻页保留标签、关键词）
export async function Pagination({ label, page, totalPage, href }: { label: string; page: number; totalPage: number; href: (page: number) => string }) {
  if (totalPage <= 1) return null;
  const { list } = await getT();
  return (
    <nav className="post-pagination" aria-label={list.pagination(label)}>
      {page > 1 ? <Link href={href(page - 1)} rel="prev">{list.prev}</Link> : <span>{list.prev}</span>}
      <span>{list.page(page, totalPage)}</span>
      {page < totalPage ? <Link href={href(page + 1)} rel="next">{list.next}</Link> : <span>{list.next}</span>}
    </nav>
  );
}

// 列表地址：筛选参数 + 页码（第 1 页不写）
export function listHref(base: string, filter: Record<string, string>, page: number) {
  const params = new URLSearchParams(filter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
