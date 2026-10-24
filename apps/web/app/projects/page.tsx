import type { Metadata } from "next";
import { Suspense } from "react";
import ProjectList from "@/components/project-list";

export const metadata: Metadata = { title: "作品" };

export default function ProjectsPage() {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取作品…</p>}>
      <ProjectList />
    </Suspense>
  );
}
