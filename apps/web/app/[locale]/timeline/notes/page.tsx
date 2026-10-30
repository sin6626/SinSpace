import type { Metadata } from "next";
import { Suspense } from "react";
import TimelineList from "@/components/timeline-list";

export const metadata: Metadata = { title: "时间线 · 手记" };

// 时间线里只看手记（和 /timeline 共用同一个列表组件）
export default function TimelineNotesPage() {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取时间线…</p>}>
      <TimelineList kind="note" />
    </Suspense>
  );
}
