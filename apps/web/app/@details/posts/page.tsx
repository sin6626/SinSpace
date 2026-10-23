import { Suspense } from "react";
import PostSidebar from "@/components/post-sidebar";
import { readText } from "@/lib/search-params";

async function Sidebar({ searchParams }: Pick<PageProps<"/posts">, "searchParams">) {
  const { q, tag } = await searchParams;
  return <PostSidebar keyword={readText(q)} activeTag={typeof tag === "string" ? tag : undefined} />;
}

export default function PostsDetails({ searchParams }: PageProps<"/posts">) {
  return (
    <Suspense fallback={<PostSidebar />}>
      <Sidebar searchParams={searchParams} />
    </Suspense>
  );
}
