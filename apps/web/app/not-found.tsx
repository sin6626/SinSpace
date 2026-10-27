import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "页面不存在" };

// 地址不存在、或详情页调用 notFound() 时显示，保留站点导航。
export default function NotFound() {
  return (
    <section className="empty-state" aria-labelledby="not-found-heading">
      <p className="empty-state-code" aria-hidden="true">404</p>
      <h1 id="not-found-heading">这里只有夜空</h1>
      <p>这个地址没有对应的内容，可能已经被删除，或者地址写错了。</p>
      <div className="empty-state-actions">
        <Link className="btn btn-primary" href="/">回到阳台</Link>
        <Link className="btn" href="/posts">看看文章</Link>
      </div>
    </section>
  );
}
