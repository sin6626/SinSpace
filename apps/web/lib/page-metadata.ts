import "server-only";
import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { getCategories, getNote, getPage, getPost } from "./blog-data";

// 详情页的 <title>、描述和分享卡片。复用页面正文同一份 "use cache" 数据，不会多请求一次 Core。
// 地址非法、内容不存在或读取失败时退回布局的默认值，错误提示和 404 由正文负责。
export const siteName = "Sin Personal Space";
export const siteDescription = "技术文章、个人作品与生活记录。";

function describe(title: string, description?: string | null, type: "article" | "website" = "article"): Metadata {
  const text = description?.trim() || undefined;
  return { title, description: text, openGraph: { siteName, title, description: text, type, locale: "zh_CN" } };
}

async function safe(load: () => Promise<Metadata | null>): Promise<Metadata> {
  try {
    return (await load()) ?? {};
  } catch (error) {
    unstable_rethrow(error);
    return {};
  }
}

// 与详情组件一致：先解码再编码，非法编码会抛错并退回默认值。
const reencode = (value: string) => encodeURIComponent(decodeURIComponent(value));

// params 要在 safe 外读取：预渲染静态外壳时 Next 用内部信号中止对 params 的等待，不能被吞掉。
export async function postMetadata(params: Promise<{ category: string; slug: string }>) {
  const { category, slug } = await params;
  return safe(async () => {
    const post = await getPost(reencode(category), reencode(slug));
    return post && describe(post.title, post.summary);
  });
}

export async function noteMetadata(params: Promise<{ nid: string }>) {
  const { nid } = await params;
  return safe(async () => {
    if (!/^[1-9]\d*$/.test(nid) || !Number.isSafeInteger(Number(nid))) return null;
    const note = await getNote(Number(nid));
    return note && !note.locked ? describe(note.title) : null;
  });
}

export async function pageMetadata(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  return safe(async () => {
    const page = await getPage(reencode(slug));
    return page && describe(page.title, page.subtitle, "website");
  });
}

export async function categoryMetadata(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  return safe(async () => {
    const decoded = decodeURIComponent(slug);
    const category = (await getCategories()).find((item) => item.slug === decoded);
    return category ? describe(category.name, `分类“${category.name}”下的文章。`, "website") : null;
  });
}
