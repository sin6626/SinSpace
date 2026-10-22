import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getApiClient } from "./api";

export async function getNavigationData() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("blog:navigation", "blog:categories", "blog:pages");
  const data = await getApiClient().aggregate.getAggregateData();
  if (!Array.isArray(data.categories) || !Array.isArray(data.pageMeta)) {
    throw new Error("导航数据缺少分类或页面。");
  }
  return {
    categories: data.categories.map(({ name, slug }) => ({ name, slug })),
    pageMeta: data.pageMeta.map(({ title, slug }) => ({ title, slug })),
  };
}

export async function getCategories() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("blog:categories");
  const { data } = await getApiClient().category.getAllCategories();
  return data.map(({ id, name, slug, type, count, created }) => ({
    id, name, slug, type, count, created,
  }));
}

export async function getPosts(page: number, categoryId?: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  cacheTag("blog:posts", "blog:categories");
  const { data, pagination } = await getApiClient().post.getList(page, 10, {
    categoryIds: categoryId ? [categoryId] : undefined,
    select: ["title", "summary", "created", "categoryId", "slug"],
  });
  return {
    data: data.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      created: post.created,
      categoryId: post.categoryId,
      category: post.category ? { name: post.category.name, slug: post.category.slug } : null,
    })),
    pagination: { ...pagination },
  };
}

export async function getPost(category: string, slug: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:posts", "blog:categories");
  const post = await getApiClient().post.getPost(category, slug);
  cacheTag(`blog:post:${post.id}`);
  return {
    title: post.title,
    text: post.text,
    contentFormat: post.contentFormat,
    created: post.created,
    category: post.category ? { name: post.category.name, slug: post.category.slug } : null,
  };
}
