import type { Metadata } from "next";
import { Suspense } from "react";
import MurmurList from "@/components/murmur-list";

export const metadata: Metadata = { title: "碎碎念" };

export default function MurmurListPage({ searchParams }: PageProps<"/[locale]/murmurs">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取碎碎念…</p>}>
      <MurmurList searchParams={searchParams} />
    </Suspense>
  );
}
