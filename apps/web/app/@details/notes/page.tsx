import { Suspense } from "react";
import NoteSidebar from "@/components/note-sidebar";
import { readText } from "@/lib/search-params";

async function Sidebar({ searchParams }: Pick<PageProps<"/notes">, "searchParams">) {
  const { q, topic } = await searchParams;
  return <NoteSidebar keyword={readText(q)} activeTopic={readText(topic, 100) || undefined} />;
}

export default function NotesDetails({ searchParams }: PageProps<"/notes">) {
  return (
    <Suspense fallback={<NoteSidebar />}>
      <Sidebar searchParams={searchParams} />
    </Suspense>
  );
}
