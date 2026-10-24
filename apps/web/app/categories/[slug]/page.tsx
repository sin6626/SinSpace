import { Suspense } from "react";
import { categoryMetadata } from "@/lib/page-metadata";
import PostList from "@/components/post-list";

export function generateMetadata({ params }: PageProps<"/categories/[slug]">) {
  return categoryMetadata(params);
}

export default function CategoryPage({ params, searchParams }: PageProps<"/categories/[slug]">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取文章…</p>}>
      <PostList params={params} searchParams={searchParams} />
    </Suspense>
  );
}
