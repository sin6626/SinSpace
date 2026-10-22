import { Suspense } from "react";
import PostList from "../post-list";

export default function PostsPage({ searchParams }: PageProps<"/posts">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取文章…</p>}>
      <PostList searchParams={searchParams} />
    </Suspense>
  );
}
