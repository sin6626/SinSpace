import { Suspense } from "react";
import HomeLatest from "@/components/home-latest";

export default function Home() {
  return (
    <>
      <header className="page-heading">
        <h1>Sin</h1>
        <p className="post-meta">技术文章、个人作品与生活记录。</p>
      </header>
      <Suspense fallback={<p className="post-list-content" role="status">正在读取最新内容…</p>}>
        <HomeLatest />
      </Suspense>
    </>
  );
}
