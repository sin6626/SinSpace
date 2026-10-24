import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "页面不存在" };

// 地址不存在、或详情页调用 notFound() 时显示，保留站点导航。
export default function NotFound() {
  return (
    <header className="page-heading">
      <h1>页面不存在</h1>
      <p className="post-meta">这个地址没有对应的内容，可能已被删除或地址有误。</p>
      <Link href="/">返回首页</Link>
    </header>
  );
}
