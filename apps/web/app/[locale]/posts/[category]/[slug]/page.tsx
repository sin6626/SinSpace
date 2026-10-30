import { Suspense } from "react";
import { postMetadata } from "@/lib/page-metadata";
import PostDetail from "@/components/post-detail";
import { getT } from "@/lib/i18n/server";

export function generateMetadata({ params }: PageProps<"/[locale]/posts/[category]/[slug]">) {
  return postMetadata(params);
}

export default async function PostPage({ params }: PageProps<"/[locale]/posts/[category]/[slug]">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">{(await getT()).common.loading}</p>}>
      <PostDetail params={params} />
    </Suspense>
  );
}
