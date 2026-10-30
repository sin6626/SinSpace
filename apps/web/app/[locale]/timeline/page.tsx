import type { Metadata } from "next";
import { Suspense } from "react";
import TimelineList from "@/components/timeline-list";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.timeline.title };
}

export default async function TimelinePage() {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">{(await getT()).common.loading}</p>}>
      <TimelineList />
    </Suspense>
  );
}
