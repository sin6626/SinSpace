import type { Metadata } from "next";
import { Suspense } from "react";
import ThinkingList from "@/components/thinking-list";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.thinking.title };
}

export default async function ThinkingListPage({ searchParams }: PageProps<"/[locale]/thinking">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">{(await getT()).common.loading}</p>}>
      <ThinkingList searchParams={searchParams} />
    </Suspense>
  );
}
