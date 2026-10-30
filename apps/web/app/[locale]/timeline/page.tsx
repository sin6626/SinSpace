import type { Metadata } from "next";
import { Suspense } from "react";
import TimelineList from "@/components/timeline-list";

export const metadata: Metadata = { title: "时间线" };

export default function TimelinePage() {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取时间线…</p>}>
      <TimelineList />
    </Suspense>
  );
}
