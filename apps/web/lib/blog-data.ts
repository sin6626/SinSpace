import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getApiClient } from "./api";

// "use cache" 函数抛出的错误会丢掉 SDK 附带的 HTTP status，
// 所以 404/403 要在缓存函数内部转成普通返回值，组件据此调用 notFound()。
function httpStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
}

// Lexical 正文 JSON 只在 lexical 格式时缓存，给富文本渲染器用；Markdown 只需要 text。
function lexicalContent(doc: { contentFormat?: string; content?: string }) {
  return doc.contentFormat === "lexical" && typeof doc.content === "string" ? { content: doc.content } : {};
}

async function orNotFound<T>(request: Promise<T>) {
  try {
    return await request;
  } catch (error) {
    if (httpStatus(error) === 404) return null;
    throw error;
  }
}

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

// 站点级设置。对外地址取后台“网站地址”（Core 的 url.webUrl），sitemap、RSS 的完整链接都以它为准，不在前端写死域名；
// 评论开关取后台“评论设置”（是否关闭评论、是否允许游客评论）。
export async function getSiteSettings() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("blog:navigation");
  const { url, commentOptions } = await getApiClient().aggregate.getAggregateData();
  const site = new URL(url.webUrl);
  if (!["http:", "https:"].includes(site.protocol)) throw new Error("后台网站地址必须是 HTTP(S)。");
  return {
    siteUrl: site.href.replace(/\/$/, ""),
    comments: { disabled: Boolean(commentOptions?.disableComment), allowGuest: commentOptions?.allowGuestComment !== false },
  };
}

// 后台“设置 → 账户 → OAuth”里启用的第三方登录（目前前端只接 GitHub）。改动没有 Webhook 事件，缓存短一些。
export async function getLoginProviders() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:navigation");
  const { data } = await getApiClient().proxy.auth.providers.get<{ data: string[] }>();
  return Array.isArray(data) ? data.filter((provider) => provider === "github") : [];
}

export async function getSiteUrl() {
  return (await getSiteSettings()).siteUrl;
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
    select: ["title", "summary", "created", "categoryId", "slug", "pin"],
  });
  return {
    data: data.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      created: post.created,
      categoryId: post.categoryId,
      // Core 把置顶文章排在最前，页面需要标出来，否则看起来像排序错了。
      pinned: Boolean(post.pin),
      category: post.category ? { name: post.category.name, slug: post.category.slug } : null,
    })),
    pagination: { ...pagination },
  };
}

export async function getPost(category: string, slug: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:posts", "blog:categories");
  const post = await orNotFound(getApiClient().post.getPost(category, slug));
  if (!post) return null;
  cacheTag(`blog:post:${post.id}`);
  return {
    id: post.id,
    title: post.title,
    summary: post.summary,
    text: post.text,
    contentFormat: post.contentFormat,
    allowComment: post.allowComment !== false,
    count: { read: post.count?.read ?? 0, like: post.count?.like ?? 0 },
    ...lexicalContent(post),
    created: post.created,
    category: post.category ? { name: post.category.name, slug: post.category.slug } : null,
  };
}

export async function getNotes(page: number) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  cacheTag("blog:notes");
  const { data, pagination } = await getApiClient().note.getList(page, 10);
  return {
    data: data.map((note) => ({
      id: note.id,
      nid: note.nid,
      title: note.title,
      created: note.created,
      mood: note.mood,
      weather: note.weather,
      topic: note.topic?.name ?? null,
    })),
    pagination: { ...pagination },
  };
}

export async function getNote(nid: number) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:notes");
  let result;
  try {
    result = await orNotFound(getApiClient().note.getNoteByNid(nid));
  } catch (error) {
    // Core 对设置了密码的手记返回 403。
    if (httpStatus(error) === 403) return { locked: true as const };
    throw error;
  }
  if (!result) return null;
  const { data: note, prev, next } = result;
  cacheTag(`blog:note:${note.id}`);
  // Mix Space 的 prev 是更新的一篇，next 是更早的一篇。
  const link = (item?: { nid?: number; title?: string }) =>
    item?.nid && item.title ? { nid: item.nid, title: item.title } : null;
  return {
    locked: false as const,
    id: note.id,
    nid: note.nid,
    title: note.title,
    text: note.text,
    contentFormat: note.contentFormat,
    allowComment: note.allowComment !== false,
    count: { read: note.count?.read ?? 0, like: note.count?.like ?? 0 },
    ...lexicalContent(note),
    created: note.created,
    mood: note.mood,
    weather: note.weather,
    topic: note.topic?.name ?? null,
    newer: link(prev),
    older: link(next),
  };
}

export async function getProjects() {
  "use cache";
  // Core 没有可勾选的作品事件，Webhook 无法通知，缓存时间设短一些。
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:projects");
  const { data } = await getApiClient().project.getAll();
  return data.map(({ id, name, description, avatar, projectUrl, previewUrl, docUrl }) => ({
    id, name, description, avatar, projectUrl, previewUrl, docUrl,
  }));
}

// 时间线：全部已发布文章与公开手记，只取标题、日期和拼链接的字段，按发布时间倒序合并。
export async function getTimeline() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:posts", "blog:notes", "blog:categories");
  const { data } = await getApiClient().aggregate.getTimeline({ sort: "desc" });
  const posts = (data.posts ?? []).flatMap((post) => post.category
    ? [{ kind: "post" as const, id: post.id, title: post.title, created: post.created, category: { name: post.category.name, slug: post.category.slug }, slug: post.slug }]
    : []);
  const notes = (data.notes ?? []).map((note) => ({ kind: "note" as const, id: note.id, title: note.title, created: note.created, nid: note.nid }));
  return [...posts, ...notes].sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
}

// 友链：Core 对访客只返回已通过、已失联、已封禁三种状态（审核中、已拒绝不返回）。
// 友链没有增删改的 Webhook 事件（只有 LINK_APPLY），和作品一样缓存短一些。
export async function getLinks() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:links");
  const data = await getApiClient().link.getAll();
  return data.data.map(({ id, name, url, avatar, description, type, state, hide }) => ({
    id, name, url, avatar, description, type, state, hide: Boolean(hide),
  }));
}

export async function getSays(page: number) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:says");
  const { data, pagination } = await getApiClient().say.getAllPaginated(page, 20);
  return {
    data: data.map(({ id, text, author, source, created }) => ({ id, text, author, source, created })),
    pagination: { ...pagination },
  };
}

// 动态按 id 游标分页：before 取上一页最后一条的 id。
export async function getRecently(before?: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:recently");
  const size = 20;
  const { data } = await getApiClient().recently.getList({ before, size });
  // 引用是 Core 直接读出的原文档，只取拼链接需要的字段。
  const ref = (refType: unknown, value: unknown) => {
    const doc = typeof value === "object" && value ? value as Record<string, unknown> : null;
    if (!doc || typeof doc.title !== "string") return null;
    const text = (key: string) => typeof doc[key] === "string" ? doc[key] as string : undefined;
    return { type: String(refType), title: doc.title, slug: text("slug"), nid: typeof doc.nid === "number" ? doc.nid : undefined, categoryId: text("category") };
  };
  return {
    data: data.map((item) => ({
      id: item.id,
      content: item.content,
      created: item.created,
      ref: ref(item.refType, item.ref),
    })),
    hasMore: data.length === size,
  };
}

// 评论：Core 对访客只返回已公开、非悄悄话的评论，邮箱已换成头像，IP/UA 不返回。
// 后台审核通过、置顶不发 Webhook 事件，所以缓存短一些；新增、编辑、删除经 COMMENT_* 事件立即失效。
export async function getComments(refId: string, page: number) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  cacheTag("blog:comments");
  const { data, pagination, readers } = await getApiClient().comment.getByRefId(refId, { page, size: 10 });
  const view = (comment: (typeof data)[number] | (typeof data)[number]["replies"][number]) => {
    const reader = comment.readerId ? readers?.[comment.readerId] : undefined;
    return {
      id: comment.id,
      author: reader?.name || comment.author || "匿名",
      avatar: reader?.image || comment.avatar,
      url: comment.url,
      text: comment.text,
      created: comment.created,
      location: comment.location,
      pinned: Boolean(comment.pin),
      deleted: Boolean(comment.isDeleted),
      parentId: comment.parentCommentId ?? null,
    };
  };
  return {
    data: data.map((comment) => ({
      ...view(comment),
      replies: comment.replies.map(view),
      hiddenReplies: comment.replyWindow?.hiddenCount ?? 0,
    })),
    pagination: { ...pagination },
  };
}

export async function getPage(slug: string) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("blog:pages");
  const page = await orNotFound(getApiClient().page.getBySlug(slug));
  if (!page) return null;
  cacheTag(`blog:page:${page.id}`);
  return {
    id: page.id,
    title: page.title,
    subtitle: page.subtitle,
    text: page.text,
    contentFormat: page.contentFormat,
    allowComment: page.allowComment !== false,
    ...lexicalContent(page),
  };
}

// 搜索关键词由访客输入；结果只含公开字段，文章/手记变动时随 Webhook 一并失效。
// Core 搜索默认返回第一页 10 条。
export async function searchPosts(keyword: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  cacheTag("blog:posts");
  const { data, pagination } = await getApiClient().search.search("post", keyword);
  return {
    total: pagination.total,
    data: data.map((post) => ({
      id: post.id,
      title: post.title,
      created: post.created,
      slug: post.slug,
      category: post.category ? { name: post.category.name, slug: post.category.slug } : null,
    })),
  };
}

export async function searchNotes(keyword: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  cacheTag("blog:notes");
  const { data, pagination } = await getApiClient().search.search("note", keyword);
  return {
    total: pagination.total,
    data: data.map((note) => ({ id: note.id, nid: note.nid, title: note.title, created: note.created })),
  };
}

// 标签来自文章，文章变动（blog:posts）时一起失效。
export async function getTags() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("blog:posts");
  const { data } = await getApiClient().category.getAllTags();
  return data
    .map(({ name, count }) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// 标签名原样传给 Core（有的标签带空格）；没有文章时 Core 返回 404，这里转成空列表。
export async function getPostsByTag(name: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:posts");
  const result = await orNotFound(getApiClient().category.getTagByName(name));
  return (result?.data ?? []).map((post) => ({
    id: post.id,
    title: post.title,
    created: post.created,
    slug: post.slug,
    category: post.category ? { name: post.category.name, slug: post.category.slug } : null,
  }));
}

// 话题本身没有文章数，用每个话题第一页的分页总数统计；话题很少，请求数可以接受。
export async function getTopics() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("blog:notes");
  const client = getApiClient();
  const { data } = await client.topic.getAll();
  const counts = await Promise.all(data.map((topic) => client.note.getNoteByTopicId(topic.id, 1, 1)));
  return data
    .map((topic, index) => ({ id: topic.id, name: topic.name, slug: topic.slug, count: counts[index].pagination.total }))
    .filter((topic) => topic.count > 0)
    .sort((a, b) => b.count - a.count);
}

// ponytail: 一次取 50 条不分页，话题下手记超过 50 篇时再加分页。
export async function getNotesByTopic(topicId: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:notes");
  const { data, pagination } = await getApiClient().note.getNoteByTopicId(topicId, 1, 50, { sortBy: "created", sortOrder: -1 });
  return {
    total: pagination.total,
    data: data.map((note) => ({ id: note.id, nid: note.nid, title: note.title, created: note.created })),
  };
}
