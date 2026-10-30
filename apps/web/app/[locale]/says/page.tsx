import type { Metadata } from "next";
import { Suspense } from "react";
import SayList from "@/components/say-list";

export const metadata: Metadata = { title: "一言" };

export default function SayListPage({ searchParams }: PageProps<"/[locale]/says">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取一言…</p>}>
      <SayList searchParams={searchParams} />
    </Suspense>
  );
}
