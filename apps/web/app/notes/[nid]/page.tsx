import { Suspense } from "react";
import NoteDetail from "@/components/note-detail";

export default function NotePage({ params }: PageProps<"/notes/[nid]">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取手记…</p>}>
      <NoteDetail params={params} />
    </Suspense>
  );
}
