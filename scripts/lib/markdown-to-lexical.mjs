// Markdown → 后台富文本编辑器（Haklex）原生的 Lexical JSON。
// 先用 remark（含 GFM）解析成语法树，再按“语法树节点类型 → 编辑器节点”的对照表生成，节点结构照搬后台编辑器保存的真实数据：
// 代码块是 code-block、提示框是 alert-quote（内容是嵌套文档）、分隔线是 horizontalrule、表格是 table/tablerow/tablecell。
// 标准 Markdown 没有的功能用 Haklex 自己的写法（Core 生成纯文本字段时也用这套）：++下划线++、||剧透||、[^脚注]、
// ::: note/tip/important/warning/caution 横幅、::: details 折叠块；高亮 Haklex 没有写法，用常见的 ==高亮==。
// 段落里只有图片时提升为块：一张是 image，连着多张是 gallery；段落里只有一个裸网址时是链接卡片 link-card。
// 图片的宽高与 thumbhash、链接卡片的标题与描述由调用方预先准备好传入。
// 写完用 lexicalToMarkdown（和 Core 一样用 allHeadlessNodes 节点表）重新加载一遍，结构不合法会直接抛错，同时得到草稿的纯文本字段。
import { randomBytes } from "node:crypto";
import { createHeadlessEditor } from "@lexical/headless";
import { allHeadlessNodes } from "@haklex/rich-headless";
import { $toMarkdown } from "@haklex/rich-headless/transformers";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const parser = unified().use(remarkParse).use(remarkGfm);

// Lexical 文本格式位
const FORMAT = { strong: 1, emphasis: 2, delete: 4, underline: 8, inlineCode: 16, highlight: 128 };
// 成对出现的行内标记：前一个开、后一个关；落单的按原文字保留
const MARKS = { "++": { format: FORMAT.underline }, "==": { format: FORMAT.highlight }, "||": { spoiler: true } };
const MARK = /(\+\+|==|\|\|)/;
const ALERT = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;
const BANNERS = new Set(["note", "tip", "important", "warning", "caution"]);
const CONTAINER_OPEN = /^:::\s*(note|tip|important|warning|caution|details)\b(.*)$/;
const element = (type, children, extra = {}) => ({ type, version: 1, children, direction: null, format: "", indent: 0, ...extra });
const text = (value, format = 0) => ({ type: "text", version: 1, text: value, format, detail: 0, mode: "normal", style: "" });
const linebreak = { type: "linebreak", version: 1 };
const blockId = () => randomBytes(6).toString("base64url").slice(0, 8);
const plain = (node) => node.value ?? node.children?.map(plain).join("") ?? "";

export function parseMarkdown(markdown) {
  return parser.runSync(parser.parse(markdown));
}

function collect(markdown, pick) {
  const found = new Set();
  const walk = (node) => {
    const value = pick(node);
    if (value) found.add(value);
    node.children?.forEach(walk);
  };
  walk(parseMarkdown(markdown));
  return [...found];
}

// 正文里出现的全部图片地址（本机路径或网址），供上传与算元数据
export const collectImageUrls = (markdown) => collect(markdown, (node) => node.type === "image" && node.url);

// 会变成链接卡片的网址（段落里只有一个裸网址），供预先抓标题与描述
export const collectLinkCardUrls = (markdown) => collect(markdown, (node) => node.type === "paragraph" && cardUrl(node));

function cardUrl(paragraphNode) {
  const [only] = paragraphNode.children;
  return paragraphNode.children.length === 1 && only.type === "link" && plain(only) === only.url ? only.url : null;
}

function inline(node, format, ctx) {
  switch (node.type) {
    case "text":
      // 段内软换行在编辑器里是 linebreak
      return node.value.split("\n").flatMap((part, i) => [...(i ? [linebreak] : []), ...(part ? [text(part, format)] : [])]);
    case "strong":
    case "emphasis":
    case "delete":
      return inlines(node.children, ctx, format | FORMAT[node.type]);
    case "inlineCode":
      return [text(node.value, format | FORMAT.inlineCode)];
    case "break":
      return [linebreak];
    case "link":
      return [element("link", inlines(node.children, ctx, format), { rel: null, target: null, title: node.title ?? null, url: node.url })];
    case "footnoteReference":
      return [{ type: "footnote", version: 1, identifier: node.identifier }];
    case "html":
      return node.value ? [text(node.value, format)] : [];
    default:
      return node.children ? inlines(node.children, ctx, format) : node.value ? [text(node.value, format)] : [];
  }
}

// 先把文字里的 ++ == || 拆成标记，按出现顺序两两配对，再一边走一边切换格式（剧透是把中间的内容包成 spoiler 节点）
function inlines(nodes, ctx, format = 0) {
  const items = nodes.flatMap((node) =>
    node.type === "text" ? node.value.split(MARK).filter(Boolean).map((part) => (MARKS[part] ? { mark: part } : { node: { type: "text", value: part } })) : [{ node }],
  );
  items.forEach((item, i) => {
    if (!item.mark || item.closer || item.opener) return;
    const close = items.findIndex((other, j) => j > i && other.mark === item.mark && !other.closer);
    if (close < 0) items[i] = { node: { type: "text", value: item.mark } };
    else [item.opener, items[close].closer] = [true, true];
  });
  const out = [];
  let current = format;
  let spoiler = null;
  for (const item of items) {
    if (!item.mark) {
      (spoiler ?? out).push(...inline(item.node, current, ctx));
    } else if (MARKS[item.mark].spoiler) {
      if (item.opener) spoiler = [];
      else (out.push(element("spoiler", spoiler)), (spoiler = null));
    } else {
      current ^= MARKS[item.mark].format;
    }
  }
  // 和编辑器一样，相邻且格式相同的文字合成一个节点
  return out.reduce((merged, node) => {
    const last = merged.at(-1);
    if (node.type === "text" && last?.type === "text" && last.format === node.format) last.text += node.text;
    else merged.push(node);
    return merged;
  }, []);
}

// 段落：图片单独成块，其余文字按原顺序留在段落里；只有一个裸网址时是链接卡片
function paragraph(node, ctx) {
  const url = cardUrl(node);
  if (url) return [{ type: "link-card", version: 1, url, ...ctx.links.get(url) }];
  const blocks = [];
  let run = [];
  let images = [];
  const flushText = () => {
    const children = inlines(run, ctx).filter((n, i, all) => !(n.type === "linebreak" && (i === 0 || i === all.length - 1)));
    if (children.some((n) => n.type !== "linebreak")) blocks.push(element("paragraph", children));
    run = [];
  };
  const flushImages = () => {
    if (images.length === 1) blocks.push(imageNode(images[0], ctx));
    if (images.length > 1) blocks.push({ type: "gallery", version: 1, layout: ctx.galleryLayout, images: images.map((img) => galleryItem(img, ctx)) });
    images = [];
  };
  for (const child of node.children) {
    const blank = child.type === "text" && !child.value.trim();
    if (child.type === "image") {
      flushText();
      images.push(child);
    } else if (blank && images.length) {
      continue;
    } else {
      flushImages();
      run.push(child);
    }
  }
  flushText();
  flushImages();
  return blocks;
}

function imageMeta(node, ctx) {
  const meta = ctx.images.get(node.url);
  if (!meta) throw new Error(`图片没有准备好：${node.url}`);
  return meta;
}

function imageNode(node, ctx) {
  const { src, width, height, thumbhash } = imageMeta(node, ctx);
  return { type: "image", version: 1, src, altText: node.alt ?? "", caption: node.title ?? "", width, height, thumbhash };
}

function galleryItem(node, ctx) {
  const { src, width, height, thumbhash } = imageMeta(node, ctx);
  return { src, alt: node.alt ?? "", width, height, thumbhash };
}

function listNode(node, ctx) {
  const check = node.children.some((item) => typeof item.checked === "boolean");
  const listType = check ? "check" : node.ordered ? "number" : "bullet";
  const items = node.children.map((item, i) => {
    const children = item.children.flatMap((child, j) => {
      if (child.type === "list") return [listNode(child, ctx)];
      const parts = child.type === "paragraph" ? inlines(child.children, ctx) : blocks([child], ctx);
      return j > 0 && child.type === "paragraph" ? [linebreak, ...parts] : parts;
    });
    return element("listitem", children, { value: (node.start ?? 1) + i, ...(check ? { checked: Boolean(item.checked) } : {}) });
  });
  return element("list", items, { listType, tag: node.ordered ? "ol" : "ul", start: node.start ?? 1 });
}

function quoteNode(node, ctx) {
  const first = node.children[0];
  const lead = first?.type === "paragraph" && first.children[0]?.type === "text" ? first.children[0] : null;
  const alert = lead?.value.match(ALERT);
  if (!alert) return element("quote", node.children.flatMap((child, i) => [...(i ? [linebreak] : []), ...(child.type === "paragraph" ? inlines(child.children, ctx) : [])]));
  lead.value = lead.value.slice(alert[0].length);
  if (!lead.value) first.children.shift();
  const content = blocks(node.children.filter((child) => child.children?.length !== 0), ctx);
  return { type: "alert-quote", version: 1, alertType: alert[1].toLowerCase(), content: { root: element("root", content) } };
}

function tableNode(node, ctx) {
  const rows = node.children.map((row, r) =>
    element("tablerow", row.children.map((cell) => element("tablecell", [element("paragraph", inlines(cell.children, ctx))], { headerState: r === 0 ? 1 : 0, colSpan: 1, rowSpan: 1, backgroundColor: null }))),
  );
  return element("table", rows);
}

// 语法树块级节点 → 编辑器节点（一个语法树节点可能变成多个块，例如段落里夹着图片）
const blockHandlers = {
  paragraph: (node, ctx) => paragraph(node, ctx),
  heading: (node, ctx) => [element("heading", inlines(node.children, ctx), { tag: `h${Math.min(node.depth, 6)}` })],
  thematicBreak: () => [{ type: "horizontalrule", version: 1 }],
  blockquote: (node, ctx) => [quoteNode(node, ctx)],
  list: (node, ctx) => [listNode(node, ctx)],
  code: (node) => [{ type: "code-block", version: 1, language: node.lang ?? "", code: node.value }],
  table: (node, ctx) => [tableNode(node, ctx)],
  html: (node) => (node.value.trim() ? [element("paragraph", [text(node.value)])] : []),
  // 脚注定义收集起来，文末统一生成一个 footnote-section
  footnoteDefinition: (node, ctx) => ((ctx.footnotes[node.identifier] = node.children.map(plain).join("\n")), []),
};

function blocks(nodes, ctx) {
  return nodes.flatMap((node) => {
    const handle = blockHandlers[node.type];
    if (!handle) throw new Error(`不支持的 Markdown 块：${node.type}（第 ${node.position?.start.line ?? "?"} 行）`);
    return handle(node, ctx);
  });
}

// ::: 容器 remark 不认识，先按行切出来：容器之间的普通 Markdown 照常解析，容器里面递归解析（容器可以嵌套，代码块里的 ::: 不算）
function splitContainers(markdown) {
  const lines = markdown.split("\n");
  const segments = [];
  let plainLines = [];
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(CONTAINER_OPEN);
    if (!open) {
      plainLines.push(lines[i]);
      continue;
    }
    let depth = 1;
    let fence = false;
    let end = i + 1;
    for (; end < lines.length; end++) {
      if (/^(```|~~~)/.test(lines[end])) fence = !fence;
      if (fence) continue;
      if (CONTAINER_OPEN.test(lines[end])) depth++;
      if (lines[end].trim() === ":::" && --depth === 0) break;
    }
    if (end >= lines.length) throw new Error(`::: ${open[1]} 没有用单独一行的 ::: 结束（第 ${i + 1} 行）`);
    segments.push({ markdown: plainLines.join("\n") });
    plainLines = [];
    segments.push({ kind: open[1], rest: open[2].trim(), markdown: lines.slice(i + 1, end).join("\n") });
    i = end;
  }
  segments.push({ markdown: plainLines.join("\n") });
  return segments;
}

function document(markdown, ctx) {
  return splitContainers(markdown).flatMap((segment) => {
    // 每段都带上全文的脚注定义，否则引用和定义不在同一段时 remark 不认这个脚注
    if (!segment.kind) return blocks(parseMarkdown(`${segment.markdown}\n\n${ctx.footnoteSource}`).children, ctx);
    const content = document(segment.markdown, ctx);
    if (BANNERS.has(segment.kind)) return [{ type: "banner", version: 1, bannerType: segment.kind, content: { root: element("root", content) } }];
    // ::: details 标题，或 Haklex 导出的 ::: details{summary="标题"}；带 open 时默认展开
    const summary = segment.rest.match(/summary="([^"]*)"/)?.[1] ?? segment.rest.replace(/\bopen\b/, "").replace(/[{}]/g, "").trim();
    return [element("details", content, { summary, open: /\bopen\b/.test(segment.rest) })];
  });
}

// images: Map<正文里写的地址, { src, width, height, thumbhash }>；links: Map<网址, { title, description }>
export function markdownToLexical(markdown, { images = new Map(), links = new Map(), galleryLayout = "grid" } = {}) {
  const footnoteSource = [...markdown.matchAll(/^\[\^[^\]\s]+\]:.*$/gm)].map((match) => match[0]).join("\n");
  const ctx = { images, links, galleryLayout, footnotes: {}, footnoteSource };
  const children = document(markdown, ctx);
  if (Object.keys(ctx.footnotes).length) children.push({ type: "footnote-section", version: 1, definitions: ctx.footnotes });
  return { root: element("root", children.map((block) => ({ ...block, $: { blockId: blockId() } }))) };
}

// 用后台同款节点表加载一遍：结构不合法会抛错；返回草稿的纯文本字段（Core 发布时也用同样方式生成）
export function lexicalToMarkdown(state) {
  const editor = createHeadlessEditor({ nodes: allHeadlessNodes, onError: (error) => { throw error; } });
  editor.setEditorState(editor.parseEditorState(JSON.stringify(state)));
  return editor.read(() => $toMarkdown()).trim();
}
