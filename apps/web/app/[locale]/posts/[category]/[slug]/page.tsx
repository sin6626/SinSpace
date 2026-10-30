import { Suspense } from "react";
import { postMetadata } from "@/lib/page-metadata";
import PostDetail from "@/components/post-detail";

export function generateMetadata({ params }: PageProps<"/[locale]/posts/[category]/[slug]">) {
  return postMetadata(params);
}

export default function PostPage({ params, searchParams }: PageProps<"/[locale]/posts/[category]/[slug]">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取文章…</p>}>
      <PostDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}
