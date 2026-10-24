import { getNotes, getPosts, getSiteUrl } from "@/lib/blog-data";
import { siteDescription, siteName } from "@/lib/page-metadata";

// RSS 2.0：最新 10 条文章与手记，标题、链接和文章摘要；全文请读者点进站点阅读。
const escape = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);

export async function GET() {
  const [site, posts, notes] = await Promise.all([getSiteUrl(), getPosts(1), getNotes(1)]);
  const link = (...segments: string[]) => `${site}/${segments.map(encodeURIComponent).join("/")}`;
  // 文章列表置顶在前，这里统一按发布时间重新排序。
  const items = [
    ...posts.data.flatMap((post) => post.category
      ? [{ title: post.title, url: link("posts", post.category.slug, post.slug), created: post.created, description: post.summary, category: post.category.name }]
      : []),
    ...notes.data.map((note) => ({ title: note.title, url: link("notes", String(note.nid)), created: note.created, description: undefined, category: "手记" })),
  ].sort((a, b) => Date.parse(b.created) - Date.parse(a.created)).slice(0, 10);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escape(siteName)}</title>
<link>${escape(site)}</link>
<description>${escape(siteDescription)}</description>
<language>zh-CN</language>
<atom:link href="${escape(link("feed.xml"))}" rel="self" type="application/rss+xml"/>
${items.length ? `<lastBuildDate>${new Date(items[0].created).toUTCString()}</lastBuildDate>\n` : ""}${items.map((item) => `<item>
<title>${escape(item.title)}</title>
<link>${escape(item.url)}</link>
<guid isPermaLink="true">${escape(item.url)}</guid>
<pubDate>${new Date(item.created).toUTCString()}</pubDate>
<category>${escape(item.category)}</category>
${item.description?.trim() ? `<description>${escape(item.description.trim())}</description>\n` : ""}</item>`).join("\n")}
</channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
