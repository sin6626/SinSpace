import { Suspense } from "react";
import { noteMetadata } from "@/lib/page-metadata";
import NoteDetail from "@/components/note-detail";

export function generateMetadata({ params }: PageProps<"/notes/[nid]">) {
  return noteMetadata(params);
}

export default function NotePage({ params, searchParams }: PageProps<"/notes/[nid]">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取手记…</p>}>
      <NoteDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}
