import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import { getApiClient } from "../lib/api";
import NavigationMenu, { type NavigationState } from "./navigation-menu";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function links(value: unknown, labelKey: "name" | "title", prefix: string) {
  if (!Array.isArray(value)) throw new Error("导航数据格式错误");
  return value.map((item: unknown) => {
    if (!isRecord(item)) throw new Error("导航条目格式错误");
    const label = item[labelKey];
    const slug = item.slug;
    if (
      typeof label !== "string" || !label.trim() ||
      typeof slug !== "string" || !slug.trim() || slug === "." || slug === ".."
    ) throw new Error("导航条目格式错误");
    return { label, href: `${prefix}${encodeURIComponent(slug)}` };
  });
}

async function NavigationData() {
  let state: NavigationState;
  try {
    const data = await getApiClient().aggregate.getAggregateData();
    state = {
      status: "ready",
      articles: links(data.categories, "name", "/categories/"),
      pages: links(data.pageMeta, "title", "/"),
    };
  } catch (error) {
    unstable_rethrow(error);
    state = { status: "error" };
  }
  return <NavigationMenu state={state} />;
}

export default function Navigation() {
  return (
    <Suspense fallback={<NavigationMenu state={{ status: "loading" }} />}>
      <NavigationData />
    </Suspense>
  );
}
