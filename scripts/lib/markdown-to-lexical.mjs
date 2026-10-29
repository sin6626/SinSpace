// Markdown → 后台富文本编辑器（Haklex）原生的 Lexical JSON。
// 先用 remark（含 GFM）解析成语法树，再按“语法树节点类型 → 编辑器节点”的对照表生成，节点结构照搬后台编辑器保存的真实数据：
// 代码块是 code-block、提示框是 alert-quote（内容是嵌套文档）、分隔线是 horizontalrule、表格是 table/tablerow/tablecell。
// 段落里只有图片时提升为块：一张是 image，连着多张是 gallery（手记常用）；图片的宽高与 thumbhash 由调用方预先算好传入。
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
const FORMAT = { strong: 1, emphasis: 2, delete: 4, inlineCode: 16 };
const ALERT = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;
const element = (type, children, extra = {}) => ({ type, version: 1, children, direction: null, format: "", indent: 0, ...extra });
const text = (value, format = 0) => ({ type: "text", version: 1, text: value, format, detail: 0, mode: "normal", style: "" });
const blockId = () => randomBytes(6).toString("base64url").slice(0, 8);

export function parseMarkdown(markdown) {
  return parser.runSync(parser.parse(markdown));
}

// 正文里出现的全部图片地址（本机路径或网址），供上传与算元数据
export function collectImageUrls(markdown) {
  const urls = new Set();
  const walk = (node) => {
    if (node.type === "image") urls.add(node.url);
    node.children?.forEach(walk);
  };
  walk(parseMarkdown(markdown));
  return [...urls];
}

function inlines(nodes, format = 0) {
  return nodes.flatMap((node) => {
    switch (node.type) {
      case "text": {
        // 段内软换行在编辑器里是 linebreak
        return node.value.split("\n").flatMap((part, i) => [...(i ? [{ type: "linebreak", version: 1 }] : []), ...(part ? [text(part, format)] : [])]);
      }
      case "strong":
      case "emphasis":
      case "delete":
        return inlines(node.children, format | FORMAT[node.type]);
      case "inlineCode":
        return [text(node.value, format | FORMAT.inlineCode)];
      case "break":
        return [{ type: "linebreak", version: 1 }];
      case "link":
        return [element("link", inlines(node.children, format), { rel: null, target: null, title: node.title ?? null, url: node.url })];
      case "html":
        return node.value ? [text(node.value, format)] : [];
      default:
        return node.children ? inlines(node.children, format) : node.value ? [text(node.value, format)] : [];
    }
  });
}

// 段落：图片单独成块，其余文字按原顺序留在段落里
function paragraph(node, ctx) {
  const blocks = [];
  let run = [];
  let images = [];
  const flushText = () => {
    const children = inlines(run).filter((n, i, all) => !(n.type === "linebreak" && (i === 0 || i === all.length - 1)));
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
      const parts = child.type === "paragraph" ? inlines(child.children) : blocks([child], ctx);
      return j > 0 && child.type === "paragraph" ? [{ type: "linebreak", version: 1 }, ...parts] : parts;
    });
    return element("listitem", children, { value: (node.start ?? 1) + i, ...(check ? { checked: Boolean(item.checked) } : {}) });
  });
  return element("list", items, { listType, tag: node.ordered ? "ol" : "ul", start: node.start ?? 1 });
}

function quoteNode(node, ctx) {
  const first = node.children[0];
  const lead = first?.type === "paragraph" && first.children[0]?.type === "text" ? first.children[0] : null;
  const alert = lead?.value.match(ALERT);
  if (!alert) return element("quote", node.children.flatMap((child, i) => [...(i ? [{ type: "linebreak", version: 1 }] : []), ...(child.type === "paragraph" ? inlines(child.children) : [])]));
  lead.value = lead.value.slice(alert[0].length);
  if (!lead.value) first.children.shift();
  const content = blocks(node.children.filter((child) => child.children?.length !== 0), ctx);
  return { type: "alert-quote", version: 1, alertType: alert[1].toLowerCase(), content: { root: element("root", content) } };
}

function tableNode(node) {
  const rows = node.children.map((row, r) =>
    element("tablerow", row.children.map((cell) => element("tablecell", [element("paragraph", inlines(cell.children))], { headerState: r === 0 ? 1 : 0, colSpan: 1, rowSpan: 1, backgroundColor: null }))),
  );
  return element("table", rows);
}

// 语法树块级节点 → 编辑器节点（一个语法树节点可能变成多个块，例如段落里夹着图片）
const blockHandlers = {
  paragraph: (node, ctx) => paragraph(node, ctx),
  heading: (node) => [element("heading", inlines(node.children), { tag: `h${Math.min(node.depth, 6)}` })],
  thematicBreak: () => [{ type: "horizontalrule", version: 1 }],
  blockquote: (node, ctx) => [quoteNode(node, ctx)],
  list: (node, ctx) => [listNode(node, ctx)],
  code: (node) => [{ type: "code-block", version: 1, language: node.lang ?? "", code: node.value }],
  table: (node) => [tableNode(node)],
  html: (node) => (node.value.trim() ? [element("paragraph", [text(node.value)])] : []),
};

function blocks(nodes, ctx) {
  return nodes.flatMap((node) => {
    const handle = blockHandlers[node.type];
    if (!handle) throw new Error(`不支持的 Markdown 块：${node.type}（第 ${node.position?.start.line ?? "?"} 行）`);
    return handle(node, ctx);
  });
}

// images: Map<正文里写的地址, { src, width, height, thumbhash }>
export function markdownToLexical(markdown, { images = new Map(), galleryLayout = "grid" } = {}) {
  const children = blocks(parseMarkdown(markdown).children, { images, galleryLayout }).map((block) => ({ ...block, $: { blockId: blockId() } }));
  return { root: element("root", children) };
}

// 用后台同款节点表加载一遍：结构不合法会抛错；返回草稿的纯文本字段（Core 发布时也用同样方式生成）
export function lexicalToMarkdown(state) {
  const editor = createHeadlessEditor({ nodes: allHeadlessNodes, onError: (error) => { throw error; } });
  editor.setEditorState(editor.parseEditorState(JSON.stringify(state)));
  return editor.read(() => $toMarkdown()).trim();
}
