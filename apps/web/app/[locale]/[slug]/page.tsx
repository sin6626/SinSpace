import { Suspense } from "react";
import { pageMetadata } from "@/lib/page-metadata";
import PageDetail from "@/components/page-detail";
import { getT } from "@/lib/i18n/server";

export function generateMetadata({ params }: PageProps<"/[locale]/[slug]">) {
  return pageMetadata(params);
}

export default async function StandalonePage({ params }: PageProps<"/[locale]/[slug]">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">{(await getT()).common.loading}</p>}>
      <PageDetail params={params} />
    </Suspense>
  );
}
