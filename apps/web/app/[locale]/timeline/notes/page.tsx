import type { Metadata } from "next";
import { Suspense } from "react";
import TimelineList from "@/components/timeline-list";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t.timeline.title} · ${t.notes.title}` };
}

// 时间线里只看手记（和 /timeline 共用同一个列表组件）
export default async function TimelineNotesPage() {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">{(await getT()).common.loading}</p>}>
      <TimelineList kind="note" />
    </Suspense>
  );
}
