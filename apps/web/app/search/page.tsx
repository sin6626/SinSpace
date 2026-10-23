import { Suspense } from "react";
import SearchResults from "@/components/search-results";

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <header className="page-heading">
        <h1>搜索</h1>
      </header>
      <Suspense fallback={<p className="post-list-content" role="status">正在搜索…</p>}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </>
  );
}
