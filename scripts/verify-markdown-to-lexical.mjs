// 检查 Markdown → 后台富文本（Lexical）转换：每种块都要变成后台编辑器原生的节点，并能被后台同款节点表重新加载。
// 不需要服务。用法：node scripts/verify-markdown-to-lexical.mjs（已并入 pnpm verify）
import assert from "node:assert/strict";
import { collectImageUrls, collectLinkCardUrls, lexicalToMarkdown, markdownToLexical } from "./lib/markdown-to-lexical.mjs";

const markdown = `## 标题

这是**加粗**、*斜体*、~~删除~~、\`代码\`和[链接](https://example.com)。
第二行

- 一
  - 嵌套
- 二

1. 甲
2. 乙

- [x] 已完成
- [ ] 未完成

> 普通引用

> [!TIP]
> 提示里也有**格式**

\`\`\`ts
const a = 1
\`\`\`

---

| 名称 | 数量 |
| --- | --- |
| 苹果 | 2 |

![单张图](./a.png "图片说明")

前面一段文字
![第一张](./b.png)
![第二张](https://img.example.com/c.jpg)
`;

const meta = (src) => ({ src, width: 800, height: 600, thumbhash: "AAAA" });
assert.deepEqual(collectImageUrls(markdown), ["./a.png", "./b.png", "https://img.example.com/c.jpg"], "收集到的图片地址不对");
const images = new Map([
  ["./a.png", meta("https://s3.example.com/a.png")],
  ["./b.png", meta("https://s3.example.com/b.png")],
  ["https://img.example.com/c.jpg", meta("https://img.example.com/c.jpg")],
]);

const state = markdownToLexical(markdown, { images, galleryLayout: "masonry" });
const top = state.root.children;
const types = top.map((n) => n.type);
assert.deepEqual(types, ["heading", "paragraph", "list", "list", "list", "quote", "alert-quote", "code-block", "horizontalrule", "table", "image", "paragraph", "gallery"], `顶层块不对：${types.join(", ")}`);
assert.ok(top.every((n) => /^[\w-]{8}$/.test(n.$?.blockId)), "每个顶层块都要有 8 位 blockId");

const [heading, para, bullet, numbered, check, quote, alert, code, , table, image, , gallery] = top;
assert.equal(heading.tag, "h2");
const paragraphs = [];
const findParagraphs = (node) => (node.type === "paragraph" && paragraphs.push(node), node.children?.forEach(findParagraphs), node.content && findParagraphs(node.content.root));
findParagraphs(state.root);
assert.ok(paragraphs.length > 3 && paragraphs.every((p) => p.textFormat === 0 && p.textStyle === ""), "段落（含表格、提示框里的）要带编辑器默认的 textFormat/textStyle");
const formats = Object.fromEntries(para.children.filter((n) => n.type === "text").map((n) => [n.text, n.format]));
assert.equal(formats["加粗"], 1, "加粗格式位");
assert.equal(formats["斜体"], 2, "斜体格式位");
assert.equal(formats["删除"], 4, "删除线格式位");
assert.equal(formats["代码"], 16, "行内代码格式位");
assert.ok(para.children.some((n) => n.type === "linebreak"), "段内换行要变成 linebreak");
assert.equal(para.children.find((n) => n.type === "link").url, "https://example.com");
assert.deepEqual([bullet.listType, bullet.tag, numbered.listType, numbered.tag, check.listType], ["bullet", "ul", "number", "ol", "check"]);
assert.equal(bullet.children[0].children.at(-1).type, "list", "嵌套列表放在列表项里");
assert.deepEqual(check.children.map((n) => n.checked), [true, false], "复选框状态");
assert.equal(quote.children[0].text, "普通引用");
assert.equal(alert.alertType, "tip");
assert.equal(alert.content.root.children[0].children[0].text, "提示里也有", "提示框里去掉了 [!TIP] 标记");
assert.deepEqual([code.language, code.code], ["ts", "const a = 1"]);
assert.deepEqual(table.children.map((row) => row.children.map((cell) => cell.headerState)), [[1, 1], [0, 0]], "表头行 headerState 为 1");
assert.deepEqual([image.src, image.altText, image.caption, image.width, image.height, image.thumbhash], ["https://s3.example.com/a.png", "单张图", "图片说明", 800, 600, "AAAA"]);
assert.equal(gallery.layout, "masonry");
assert.deepEqual(gallery.images.map((img) => img.src), ["https://s3.example.com/b.png", "https://img.example.com/c.jpg"], "连着的多张图合成相册");

const text = lexicalToMarkdown(state);
for (const fragment of ["## 标题", "**加粗**", "苹果", "const a = 1", "https://s3.example.com/a.png"]) {
  assert.ok(text.includes(fragment), `后台节点表重新加载后导出的纯文本缺少：${fragment}`);
}

assert.throws(() => markdownToLexical("![没准备](./x.png)"), /图片没有准备好/, "未上传的图片要报错，不能悄悄生成坏节点");

// Haklex 扩展写法
const extended = `开头有++*下划线斜体*++、==高亮==和||剧透内容||，落单的 ++ 与 a == b 保持原样。脚注在这里[^gold]。

::: tip
横幅里的**加粗**
:::

::: details 点开看看
折叠里的第一段

::: warning
嵌套的横幅
:::
:::

::: details{summary="默认展开" open}
展开的内容
:::

<https://github.com/Innei/Shiro>

[^gold]: 脚注的说明文字
`;
assert.deepEqual(collectLinkCardUrls(extended), ["https://github.com/Innei/Shiro"], "只有单独一行的裸网址才是链接卡片");
const rich = markdownToLexical(extended, { links: new Map([["https://github.com/Innei/Shiro", { title: "Shiro", description: "博客前端" }]]) });
const richTop = rich.root.children;
assert.deepEqual(richTop.map((n) => n.type), ["paragraph", "banner", "details", "details", "link-card", "footnote-section"], `扩展写法的顶层块不对：${richTop.map((n) => n.type).join(", ")}`);
const [lead, tip, details, openDetails, card, notes] = richTop;
const leadText = Object.fromEntries(lead.children.filter((n) => n.type === "text").map((n) => [n.text, n.format]));
assert.equal(leadText["下划线斜体"], 8 | 2, "++*…*++ 是下划线加斜体");
assert.equal(leadText["高亮"], 128, "==…== 是高亮");
assert.equal(lead.children.find((n) => n.type === "spoiler")?.children[0].text, "剧透内容", "||…|| 是剧透");
assert.ok(lead.children.some((n) => n.type === "text" && n.text.includes("落单的 ++ 与 a == b")), "落单的标记按原文字保留");
assert.equal(lead.children.find((n) => n.type === "footnote")?.identifier, "gold");
assert.deepEqual([tip.bannerType, tip.content.root.children[0].children.find((n) => n.text === "加粗")?.format], ["tip", 1], "横幅里的格式要保留");
assert.deepEqual([details.summary, details.open, details.children.map((n) => n.type)], ["点开看看", false, ["paragraph", "banner"]], "折叠块里可以嵌套横幅");
assert.deepEqual([openDetails.summary, openDetails.open], ["默认展开", true]);
assert.deepEqual([card.url, card.title, card.description], ["https://github.com/Innei/Shiro", "Shiro", "博客前端"]);
assert.deepEqual(notes.definitions, { gold: "脚注的说明文字" });
const richText = lexicalToMarkdown(rich);
for (const fragment of ["::: tip", "::: details", "||剧透内容||", "[^gold]"]) assert.ok(richText.includes(fragment), `扩展写法重新加载后缺少：${fragment}`);
assert.throws(() => markdownToLexical("::: note\n没有结束"), /没有用单独一行的 ::: 结束/);
console.log("verify-markdown-to-lexical: 通过");
