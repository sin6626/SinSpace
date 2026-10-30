import type { Metadata } from "next";
import { Suspense } from "react";
import NoteList from "@/components/note-list";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.notes.title };
}

export default async function NotesPage({ searchParams }: PageProps<"/[locale]/notes">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">{(await getT()).common.loading}</p>}>
      <NoteList searchParams={searchParams} />
    </Suspense>
  );
}
