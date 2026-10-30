import type { Metadata } from "next";
import { Suspense } from "react";
import ProjectList from "@/components/project-list";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.projects.title };
}

export default async function ProjectsPage() {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">{(await getT()).common.loading}</p>}>
      <ProjectList />
    </Suspense>
  );
}
