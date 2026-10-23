import { Suspense } from "react";
import PageDetail from "@/components/page-detail";

export default function StandalonePage({ params }: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取页面…</p>}>
      <PageDetail params={params} />
    </Suspense>
  );
}
