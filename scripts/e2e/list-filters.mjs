// 浏览器回归测试：文章、手记列表的筛选（2026-10-31 与用户约定的规则）。
// 曾经的问题：点标签、话题或在列表页搜索后，换成一个只有标题的结果页，没有摘要和统计；文章的分类那一行消失，页面上回不到完整列表。
// 现在：① 标签、搜索、话题的结果和普通列表同一种条目（摘要、阅读时长等）；② 文章的分类那一行一直在；
// ③ 标签和搜索在列表上方显示一枚“当前筛选 ×”，点 × 回到完整列表；④ 分类、标签、搜索同时只生效一个（分类页点标签会离开分类）；
// ⑤ 手记的话题排成一行（全部手记 / 各话题），当前话题高亮；⑥ 结果多于 10 条时分页且翻页保留筛选；⑦ 标签抽屉展开、收起有过渡动画。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser, sleep } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const browser = await openBrowser({ port: 9368 });

const list = () => browser.evaluate(`(() => {
  const content = [...document.querySelectorAll(".site-content")].find((el) => el.offsetParent !== null) ?? document;
  const entries = [...content.querySelectorAll(".post-list .entry, .note-list .entry")];
  const row = content.querySelector(".post-categories");
  const chip = content.querySelector(".active-filter");
  return {
    path: location.pathname + location.search,
    heading: content.querySelector("h1")?.textContent,
    entries: entries.length,
    excerpts: entries.filter((entry) => entry.querySelector(".entry-excerpt")).length,
    stats: entries.filter((entry) => entry.querySelector(".entry-stats")).length,
    row: row ? [...row.querySelectorAll("a")].map((a) => ({ text: a.textContent, href: a.getAttribute("href"), current: a.getAttribute("aria-current") === "page" })) : null,
    chip: chip ? { text: chip.textContent, clear: chip.querySelector("a")?.getAttribute("href") } : null,
    pages: content.querySelector(".post-pagination") ? [...content.querySelectorAll(".post-pagination a")].map((a) => a.getAttribute("href")) : null,
  };
})()`);
const click = async (selector) => {
  await browser.evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].find((el) => el.offsetParent !== null).click()`);
  await sleep(2500);
};

try {
  await browser.setViewport(1920, 991);

  await browser.goto(`${base}/posts?tag=Vue`);
  const tag = await list();
  assert.ok(tag.entries > 0 && tag.excerpts === tag.entries && tag.stats === tag.entries, `标签结果应是完整条目（摘要、统计）：${JSON.stringify(tag)}`);
  assert.ok(tag.row?.some((link) => link.href === "/posts"), `选了标签时分类那一行应还在：${JSON.stringify(tag.row)}`);
  assert.ok(tag.row.every((link) => !link.current), "选了标签时不应有分类处于选中");
  assert.ok(tag.chip?.text.includes("Vue") && tag.chip.clear === "/posts", `应显示“Vue ×”且 × 回到完整列表：${JSON.stringify(tag.chip)}`);

  await click(".active-filter a");
  const cleared = await list();
  assert.equal(cleared.path, "/posts", "点 × 应回到 /posts");
  assert.equal(cleared.chip, null, "回到完整列表后不应再有筛选标记");

  const category = cleared.row.find((link) => link.href.startsWith("/categories/"));
  await browser.goto(base + category.href);
  await click(".tag-drawer summary");
  await click(".tag-drawer .tag-chip");
  const fromCategory = await list();
  assert.match(fromCategory.path, /^\/posts\?tag=/, `分类页点标签应离开分类、只按标签筛：${fromCategory.path}`);
  assert.ok(fromCategory.row.every((link) => !link.current), "离开分类后分类那一行不应有选中项");

  await browser.goto(`${base}/posts?q=${encodeURIComponent("的")}`);
  const search = await list();
  assert.ok(search.entries > 0 && search.excerpts === search.entries, `搜索结果应是完整条目：${JSON.stringify(search)}`);
  assert.ok(search.row && search.chip?.text.includes("的") && search.chip.clear === "/posts", `搜索时应有分类那一行和“的 ×”：${JSON.stringify(search.chip)}`);
  if (search.entries === 10) assert.ok(search.pages?.some((href) => href.includes("q=") && href.includes("page=2")), `搜索结果多于一页时应分页且保留关键词：${JSON.stringify(search.pages)}`);

  await browser.goto(`${base}/notes?topic=current-situation`);
  const topic = await list();
  assert.ok(topic.entries > 0 && topic.excerpts === topic.entries, `话题结果应是完整条目：${JSON.stringify(topic)}`);
  assert.ok(topic.row?.some((link) => link.href === "/notes" && !link.current) && topic.row.some((link) => link.current && link.href.includes("topic=current-situation")), `手记话题应排成一行且当前话题选中：${JSON.stringify(topic.row)}`);

  await browser.goto(`${base}/notes?q=${encodeURIComponent("的")}`);
  const noteSearch = await list();
  assert.ok(noteSearch.entries > 0 && noteSearch.excerpts === noteSearch.entries && noteSearch.chip?.clear === "/notes", `手记搜索应是完整条目并有“的 ×”：${JSON.stringify(noteSearch)}`);

  await browser.goto(`${base}/posts`);
  // Chrome 的 getAnimations() 不列出 ::details-content 上的过渡，所以直接量展开内容的高度：刚点下时在 0 和最终高度之间，过一会儿到位；收起同理
  const drawer = await browser.evaluate(`(async () => {
    const details = document.querySelector(".tag-drawer");
    const height = () => parseFloat(getComputedStyle(details, "::details-content").height);
    // 点下后逐帧记 400 毫秒的高度
    const sample = async () => {
      const heights = [];
      const end = performance.now() + 400;
      while (performance.now() < end) {
        await new Promise((r) => requestAnimationFrame(r));
        heights.push(height());
      }
      return heights;
    };
    details.querySelector("summary").click();
    const opening = await sample();
    details.querySelector("summary").click();
    const closing = await sample();
    return { opening, closing };
  })()`);
  const open = drawer.opening.at(-1);
  const between = (heights) => heights.filter((h) => h > 0 && h < open).length;
  assert.ok(open > 0 && between(drawer.opening) >= 2, `展开标签抽屉应有高度过渡：${JSON.stringify(drawer.opening)}`);
  assert.ok(drawer.closing.at(-1) === 0 && between(drawer.closing) >= 2, `收起标签抽屉也应有过渡：${JSON.stringify(drawer.closing)}`);

  assert.deepEqual(browser.errors, [], `页面报错：${browser.errors.join("\n")}`);
  console.log(`PASS 标签/搜索/话题结果为完整条目（Vue ${tag.entries} 篇、搜索“的” ${search.entries} 篇、近况 ${topic.entries} 篇）、分类行常驻、“×”回到完整列表、分类页点标签离开分类、手记话题成行、抽屉展开 ${between(drawer.opening)} 帧过渡到 ${Math.round(open)}px、收起 ${between(drawer.closing)} 帧过渡到 0`);
} finally {
  browser.close();
}
