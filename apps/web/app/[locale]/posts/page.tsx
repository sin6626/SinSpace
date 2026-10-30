import type { Metadata } from "next";
import { Suspense } from "react";
import PostList from "@/components/post-list";

export const metadata: Metadata = { title: "文章" };

export default function PostsPage({ searchParams }: PageProps<"/[locale]/posts">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取文章…</p>}>
      <PostList searchParams={searchParams} />
    </Suspense>
  );
}
