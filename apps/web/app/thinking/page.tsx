import type { Metadata } from "next";
import { Suspense } from "react";
import ThinkingList from "@/components/thinking-list";

export const metadata: Metadata = { title: "碎碎念" };

export default function ThinkingListPage({ searchParams }: PageProps<"/thinking">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取碎碎念…</p>}>
      <ThinkingList searchParams={searchParams} />
    </Suspense>
  );
}
