import type { Metadata } from "next";
import { Suspense } from "react";
import ThinkingList from "@/components/thinking-list";

export const metadata: Metadata = { title: "思考" };

export default function ThinkingListPage({ searchParams }: PageProps<"/thinking">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取思考…</p>}>
      <ThinkingList searchParams={searchParams} />
    </Suspense>
  );
}
