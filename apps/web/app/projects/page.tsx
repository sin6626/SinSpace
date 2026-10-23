import { Suspense } from "react";
import ProjectList from "@/components/project-list";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<p className="post-list-content" role="status">正在读取作品…</p>}>
      <ProjectList />
    </Suspense>
  );
}
