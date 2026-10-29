import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getApiClient } from "./api";
import { safeUrl } from "./safe-url";
import { excerpt, readingMinutes } from "./excerpt";

// 站名和描述以后台 SEO 设置为准（getSiteSettings），这两个值只是读取失败时的兜底。
export const siteName = "Sin’s Space";
export const siteDescription = "夜深里也有月亮和星星陪我作伴";

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
    // 后台页面按“排序”字段排列（关于我在关于本站前面）。
    pageMeta: [...data.pageMeta].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(({ title, slug }) => ({ title, slug })),
  };
}

// 站点级设置。对外地址取后台“网站地址”（Core 的 url.webUrl），sitemap、RSS 的完整链接都以它为准，不在前端写死域名；
// 评论开关取后台“评论设置”（是否关闭评论、是否允许游客评论）；站名和一句话描述取后台 SEO 设置，前端不写死。
export async function getSiteSettings() {
  "use cache";
  // 改站名、描述、评论设置都没有 Webhook 事件，后台改完 5 分钟内生效。
  // stale 至少 300 秒：Next 只把 stale ≥ 5 分钟的缓存放进预渲染外壳，太短的话根布局的 generateMetadata 会被当成动态数据，
  // 整页静态的路由（/debug）会报 “encountered URL data in generateMetadata()”。回归测试 scripts/e2e/dev-issues.mjs。
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag("blog:navigation");
  const { url, commentOptions, seo } = await getApiClient().aggregate.getAggregateData();
  const site = new URL(url.webUrl);
  if (!["http:", "https:"].includes(site.protocol)) throw new Error("后台网站地址必须是 HTTP(S)。");
  return {
    siteUrl: site.href.replace(/\/$/, ""),
    name: seo?.title?.trim() || siteName,
    description: seo?.description?.trim() || siteDescription,
    comments: { disabled: Boolean(commentOptions?.disableComment), allowGuest: commentOptions?.allowGuestComment !== false },
  };
}

// 后台“设置 → 账户 → OAuth”里启用的第三方登录（前端接了 GitHub 和 Google）。改动没有 Webhook 事件，缓存短一些。
export async function getLoginProviders() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:navigation");
  const { data } = await getApiClient().proxy.auth.providers.get<{ data: string[] }>();
  // 前端目前支持 GitHub 和 Google 两种读者登录
  return Array.isArray(data) ? data.filter((provider): provider is "github" | "google" => provider === "github" || provider === "google") : [];
}

// 邮件订阅：后台开启订阅且配置了邮件服务时才可用；只放行文章、手记两类（Core 的 allow_types）。
export async function getSubscribeOptions() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:navigation");
  const status = await getApiClient().subscribe.check();
  const types = (status.allowTypes ?? []).filter((type): type is "post_c" | "note_c" => type === "post_c" || type === "note_c");
  return { enabled: Boolean(status.enable) && types.length > 0, types };
}

// 后台“社交账号”里认识的几种，换成主页地址；不认识的忽略。账号里可能带着查询参数（如 B 站的 spm），只取问号前面。
const socialSites: Record<string, { label: string; url: (id: string) => string }> = {
  github: { label: "GitHub", url: (id) => `https://github.com/${id}` },
  bilibili: { label: "Bilibili", url: (id) => `https://space.bilibili.com/${id}` },
  twitter: { label: "X", url: (id) => `https://x.com/${id}` },
  x: { label: "X", url: (id) => `https://x.com/${id}` },
  zhihu: { label: "知乎", url: (id) => `https://www.zhihu.com/people/${id}` },
  weibo: { label: "微博", url: (id) => `https://weibo.com/${id}` },
};

function socialLinks(ids: unknown) {
  if (!ids || typeof ids !== "object") return [];
  return Object.entries(ids as Record<string, unknown>).flatMap(([key, value]) => {
    const site = socialSites[key.toLowerCase()];
    const id = typeof value === "string" ? value.split("?")[0].trim() : "";
    return site && /^[\w.-]+$/.test(id) ? [{ label: site.label, href: site.url(encodeURIComponent(id)) }] : [];
  });
}

// 首页的自我介绍：后台“个人资料”的名字、头像、一句话介绍，以及“关于我”页面的地址（标题含“关于我”的页面，否则排第一的页面）。
export async function getOwner() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:navigation", "blog:pages");
  const { user, pageMeta } = await getApiClient().aggregate.getAggregateData();
  const pages = Array.isArray(pageMeta) ? [...pageMeta].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
  const about = pages.find((page) => page.title.includes("关于我")) ?? pages[0];
  return {
    name: user.name?.trim() || user.username,
    avatar: safeUrl(user.avatar ?? undefined),
    introduce: user.introduce?.trim() || undefined,
    aboutHref: about?.slug ? `/${encodeURIComponent(about.slug)}` : undefined,
    socials: socialLinks(user.socialIds),
  };
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

// 列表里每条的摘要按这个顺序取，保证不冷清（用户 2026-10-29 定）：AI 摘要 → 自己写的摘要 → 正文开头。
// AI 摘要只读后台已生成的（getArticleAi，1 小时缓存，与详情页共用），读不到就往下退。
export type ListExcerpt = { text: string; source: "ai" | "summary" | "text" } | null;
async function listExcerpt(id: string, summary: string | null | undefined, text: string | null | undefined): Promise<ListExcerpt> {
  const ai = await getArticleAi(id).catch(() => null);
  if (ai?.summary) return { text: ai.summary, source: "ai" };
  if (summary?.trim()) return { text: summary.trim(), source: "summary" };
  const body = excerpt(text, 120);
  return body ? { text: body, source: "text" } : null;
}

export async function getPosts(page: number, categoryId?: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  cacheTag("blog:posts", "blog:categories");
  const { data, pagination } = await getApiClient().post.getList(page, 10, {
    categoryIds: categoryId ? [categoryId] : undefined,
    // text 只在服务端用来算摘录和阅读时长，不返回给页面
    select: ["title", "summary", "text", "created", "categoryId", "slug", "pin", "tags", "count"],
  });
  return {
    data: await Promise.all(data.map(async (post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      excerpt: await listExcerpt(post.id, post.summary, post.text),
      stats: { minutes: readingMinutes(post.text), reads: post.count?.read ?? 0, likes: post.count?.like ?? 0 },
      tags: (post.tags ?? []).slice(0, 3),
      created: post.created,
      categoryId: post.categoryId,
      // Core 把置顶文章排在最前，页面需要标出来，否则看起来像排序错了。
      pinned: Boolean(post.pin),
      category: post.category ? { name: post.category.name, slug: post.category.slug } : null,
    }))),
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
    // 手记没有手写摘要字段：AI 摘要 → 正文开头
    data: await Promise.all(data.map(async (note) => ({
      id: note.id,
      nid: note.nid,
      title: note.title,
      created: note.created,
      mood: note.mood,
      weather: note.weather,
      topic: note.topic?.name ?? null,
      excerpt: await listExcerpt(note.id, null, note.text),
      stats: { minutes: readingMinutes(note.text), reads: note.count?.read ?? 0, likes: note.count?.like ?? 0 },
    }))),
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

// 首屏“喜欢本站”的计数（Core 的 GET /like_this）。点赞由浏览器直接 POST 给 Core（按访客 IP 每天一次），这里只读计数，缓存很短。
export async function getSiteLikes() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 600 });
  cacheTag("blog:site-like");
  const value = await getApiClient().proxy.like_this.get<number>();
  return typeof value === "number" ? value : Number(value) || 0;
}

// 首页“最近发生的事”（同 Shiro）：Core 的 /activity/recent 返回评论、点赞、新文章、新手记、新碎碎念五类，
// 评论只含已公开、非悄悄话的。点赞没有 Webhook 事件，缓存短一些。文章只给了 slug，借时间线换算出带分类的地址。
export type RecentActivity = {
  key: string;
  kind: "comment" | "like" | "post" | "note" | "recent";
  created: string;
  title?: string;
  href: string | null;
  author?: string;
  avatar?: string;
  text?: string;
};

export async function getRecentActivity() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 120, expire: 600 });
  cacheTag("blog:posts", "blog:notes", "blog:comments", "blog:recently", "blog:categories");
  const [data, timeline] = await Promise.all([getApiClient().activity.getRecentActivities(), getTimeline()]);
  const posts = new Map(timeline.flatMap((item) => item.kind === "post" ? [[item.slug, `/posts/${encodeURIComponent(item.category.slug)}/${encodeURIComponent(item.slug)}`]] : []));
  const record = data as unknown as Record<string, Array<Record<string, unknown>>>;
  const text = (value: unknown) => typeof value === "string" ? value : undefined;
  const href = (type: unknown, item: Record<string, unknown>) => {
    const kind = String(type).toLowerCase();
    if (kind.startsWith("note")) return item.nid ? `/notes/${item.nid}` : null;
    if (kind.startsWith("post")) return posts.get(text(item.slug) ?? "") ?? null;
    if (kind.startsWith("page")) return item.slug ? `/${encodeURIComponent(String(item.slug))}` : null;
    if (kind.startsWith("recent")) return "/thinking";
    return null;
  };
  const items: RecentActivity[] = [
    ...(record.comment ?? []).map((item) => ({
      key: `comment-${item.id}-${item.created}`, kind: "comment" as const, created: String(item.created),
      title: text(item.title) ?? (String(item.type).toLowerCase().startsWith("recent") ? "一条碎碎念" : undefined),
      href: href(item.type, item), author: text(item.author), avatar: safeUrl(text(item.avatar)), text: excerpt(text(item.text), 80),
    })),
    ...(record.like ?? []).map((item) => ({ key: `like-${item.id}`, kind: "like" as const, created: String(item.created), title: text(item.title) ?? "已删除的内容", href: href(item.type, item) })),
    ...(record.post ?? []).map((item) => ({ key: `post-${item.id}`, kind: "post" as const, created: String(item.created), title: text(item.title), href: href("posts", item) })),
    ...(record.note ?? []).map((item) => ({ key: `note-${item.id}`, kind: "note" as const, created: String(item.created), title: text(item.title), href: href("notes", item) })),
    ...(record.recent ?? []).map((item) => ({ key: `recent-${item.id}`, kind: "recent" as const, created: String(item.created), href: "/thinking", text: excerpt(text(item.content), 80) })),
  ];
  return items.sort((a, b) => Date.parse(b.created) - Date.parse(a.created)).slice(0, 12);
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

// 后台“友链设置”里是否开放申请。改动没有 Webhook 事件，缓存短一些。
export async function getLinkApplyOpen() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:links");
  return Boolean(await getApiClient().link.canApplyLink());
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
      up: item.up ?? 0,
      down: item.down ?? 0,
      comments: (item as { comments?: number }).comments ?? 0,
      allowComment: item.allowComment !== false,
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
      // 站长在后台或以站长身份登录发的评论，评论悬浮窗里放在右侧
      owner: reader?.role === "owner",
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

// AI 摘要与翻译：只读取后台已生成的内容（onlyDb），前端从不触发生成，费用完全由后台控制。
// 生成、修改摘要/翻译都不发 Webhook 事件，缓存 1 小时。站点原文是中文，翻译只列出非中文的语言。
export const translationLanguages = { en: "English", ja: "日本語" } as const;
export type TranslationLanguage = keyof typeof translationLanguages;
export const isTranslationLanguage = (value: unknown): value is TranslationLanguage =>
  typeof value === "string" && Object.hasOwn(translationLanguages, value);

export async function getArticleAi(id: string, lang: "zh" | TranslationLanguage = "zh") {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("blog:ai", `blog:ai:${id}`);
  const ai = getApiClient().ai;
  const [summary, languages] = await Promise.all([
    ai.getSummary({ articleId: id, lang, onlyDb: true }).catch(() => null),
    ai.getAvailableLanguages(id).catch(() => []),
  ]);
  // Core 返回 { data: [...] }，SDK 类型写的是数组，两种都兼容。
  const list: unknown = Array.isArray(languages) ? languages : (languages as { data?: unknown })?.data;
  return {
    summary: typeof summary?.summary === "string" && summary.summary.trim() ? summary.summary.trim() : null,
    languages: Array.isArray(list) ? list.filter(isTranslationLanguage) : [],
  };
}

export async function getArticleTranslation(id: string, lang: TranslationLanguage) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("blog:ai", `blog:ai:${id}`);
  const translation = await orNotFound(getApiClient().ai.getTranslation({ articleId: id, lang }));
  if (!translation) return null;
  const doc = translation as typeof translation & { contentFormat?: string; content?: string };
  return {
    title: doc.title,
    text: doc.text,
    contentFormat: doc.contentFormat,
    ...lexicalContent(doc),
    sourceLang: doc.sourceLang,
    aiModel: doc.aiModel,
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
    .map((topic, index) => ({ id: topic.id, name: topic.name, slug: topic.slug, icon: safeUrl(topic.icon ?? undefined), count: counts[index].pagination.total }))
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

// 顶部导航悬停面板（navigation-menu.tsx）的数据，全部复用已有缓存：
// 首页面板的“此间”三个数字取 Core 的 /aggregate/site_info（文章数、手记数、全站字数、第一篇发布日期；SDK 会把字段转成驼峰），
// 文章面板按分类列出篇数和各分类最近 5 篇，手记面板按话题列出篇数和各话题最近 5 篇，时间线面板列出近期文章与手记。
// 建站天数在缓存函数里按当时时间算，最多晚一个缓存周期（1 小时）变化，跨零点那一会儿可能差一天。
export type NavigationEntry = { id: string; title: string; created: string; href: string; kind: "post" | "note" };

export async function getNavigationPanels() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("blog:posts", "blog:notes", "blog:categories", "blog:navigation");
  const [site, categories, timeline, topics] = await Promise.all([
    getApiClient().proxy.aggregate.site_info.get<{ postCount?: number; noteCount?: number; totalWordCount?: number; firstPublishDate?: string }>(),
    getCategories(),
    getTimeline(),
    getTopics().catch(() => []),
  ]);
  const entry = (item: Awaited<ReturnType<typeof getTimeline>>[number]): NavigationEntry => ({
    id: item.id,
    title: item.title,
    created: item.created,
    kind: item.kind,
    href: item.kind === "post"
      ? `/posts/${encodeURIComponent(item.category.slug)}/${encodeURIComponent(item.slug)}`
      : `/notes/${item.nid}`,
  });
  const posts = timeline.filter((item) => item.kind === "post");
  const topicNotes = await Promise.all(topics.map((topic) => getNotesByTopic(topic.id).catch(() => ({ data: [] }))));
  const first = Date.parse(site.firstPublishDate ?? "");
  return {
    stats: {
      writings: (site.postCount ?? 0) + (site.noteCount ?? 0),
      words: site.totalWordCount ?? 0,
      days: Number.isFinite(first) ? Math.max(1, Math.ceil((Date.now() - first) / 86_400_000)) : null,
    },
    postCount: site.postCount ?? posts.length,
    noteCount: site.noteCount ?? timeline.length - posts.length,
    categories: categories.filter((category) => category.type === 0).map((category) => ({
      name: category.name,
      href: `/categories/${encodeURIComponent(category.slug)}`,
      count: category.count ?? 0,
      recent: posts.filter((item) => item.kind === "post" && item.category.slug === category.slug).slice(0, 5).map(entry),
    })),
    // 手记页按话题的 slug 筛选（和页内“按话题”抽屉一致），不能用名字
    topics: topics.map((topic, index) => ({
      name: topic.name,
      icon: topic.icon,
      count: topic.count,
      href: `/notes?topic=${encodeURIComponent(topic.slug)}`,
      recent: topicNotes[index].data.slice(0, 5).map((note): NavigationEntry => ({ id: note.id, title: note.title, created: note.created, kind: "note", href: `/notes/${note.nid}` })),
    })),
    recentNotes: timeline.filter((item) => item.kind === "note").slice(0, 5).map(entry),
    recentPosts: posts.slice(0, 5).map(entry),
    recent: timeline.slice(0, 5).map(entry),
  };
}
