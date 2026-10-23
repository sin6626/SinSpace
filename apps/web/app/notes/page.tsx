import { Suspense } from "react";
import NoteList from "@/components/note-list";

export default function NotesPage({ searchParams }: PageProps<"/notes">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取手记…</p>}>
      <NoteList searchParams={searchParams} />
    </Suspense>
  );
}
