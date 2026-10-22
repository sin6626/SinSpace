import { Suspense } from "react";
import PostDetail from "../../../post-detail";

export default function PostPage({ params }: PageProps<"/posts/[category]/[slug]">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取文章…</p>}>
      <PostDetail params={params} />
    </Suspense>
  );
}
