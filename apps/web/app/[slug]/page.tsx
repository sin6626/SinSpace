import { Suspense } from "react";
import { pageMetadata } from "@/lib/page-metadata";
import PageDetail from "@/components/page-detail";

export function generateMetadata({ params }: PageProps<"/[slug]">) {
  return pageMetadata(params);
}

export default function StandalonePage({ params }: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取页面…</p>}>
      <PageDetail params={params} />
    </Suspense>
  );
}
