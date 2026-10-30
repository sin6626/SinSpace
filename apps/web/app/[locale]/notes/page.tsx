import type { Metadata } from "next";
import { Suspense } from "react";
import NoteList from "@/components/note-list";

export const metadata: Metadata = { title: "手记" };

export default function NotesPage({ searchParams }: PageProps<"/[locale]/notes">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取手记…</p>}>
      <NoteList searchParams={searchParams} />
    </Suspense>
  );
}
