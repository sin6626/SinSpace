import { Suspense } from "react";
import { categoryMetadata } from "@/lib/page-metadata";
import PostList from "@/components/post-list";
import { getT } from "@/lib/i18n/server";

export function generateMetadata({ params }: PageProps<"/[locale]/categories/[slug]">) {
  return categoryMetadata(params);
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[locale]/categories/[slug]">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">{(await getT()).common.loading}</p>}>
      <PostList params={params} searchParams={searchParams} />
    </Suspense>
  );
}
