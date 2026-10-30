import { Suspense } from "react";
import { noteMetadata } from "@/lib/page-metadata";
import NoteDetail from "@/components/note-detail";
import { getT } from "@/lib/i18n/server";

export function generateMetadata({ params }: PageProps<"/[locale]/notes/[nid]">) {
  return noteMetadata(params);
}

export default async function NotePage({ params }: PageProps<"/[locale]/notes/[nid]">) {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">{(await getT()).common.loading}</p>}>
      <NoteDetail params={params} />
    </Suspense>
  );
}
