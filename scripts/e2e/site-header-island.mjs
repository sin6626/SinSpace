// 浏览器回归测试：页头“夜航岛”（components/site-header.tsx）的几种状态。
// 顶部铺开（bar）→ 往下滚收成胶囊（compact，比铺开时窄得多）→ 鼠标移上展开（expanded，导航回到胶囊里）→ 移开收回；
// 文章详情页往下读时胶囊显示标题与阅读进度；在 /debug 播报一条活动（activity），播完缩回。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser, sleep } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const browser = await openBrowser({ port: 9339 });
const island = () => browser.evaluate(`(() => {
  const header = document.querySelector(".site-header");
  const rect = document.querySelector(".island").getBoundingClientRect();
  return { mode: header.dataset.mode, x: rect.x, width: Math.round(rect.width), navVisible: document.querySelector(".island .navigation-List").checkVisibility(), text: document.querySelector(".island").innerText };
})()`);
const move = (x, y) => browser.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });

try {
  await browser.setViewport(1920, 991);
  await browser.goto(`${base}/posts`);
  const bar = await island();
  assert.equal(bar.mode, "bar");
  assert.ok(bar.navVisible, "顶部时导航应当可见");

  await browser.evaluate("scrollTo(0, 500)");
  await sleep(900);
  const compact = await island();
  assert.equal(compact.mode, "compact", "往下滚后应当收成胶囊");
  assert.ok(compact.width < bar.width / 3 && !compact.navVisible, `胶囊应当很窄且不显示导航（宽 ${compact.width}）`);
  assert.match(compact.text, /文章/);

  await move(compact.x + compact.width / 2, 30);
  await sleep(900);
  const expanded = await island();
  assert.equal(expanded.mode, "expanded", "鼠标移上胶囊应当展开");
  assert.ok(expanded.navVisible, "展开后导航应当可见");

  await move(960, 700);
  await sleep(900);
  assert.equal((await island()).mode, "compact", "鼠标移开后应当收回");

  await browser.goto(`${base}/timeline/posts`, 3000);
  const post = await browser.evaluate(`document.querySelector(".timeline-list a").getAttribute("href")`);
  await browser.goto(base + post);
  await browser.evaluate("scrollTo(0, document.documentElement.scrollHeight * 0.4)");
  await sleep(900);
  const reading = await browser.evaluate(`({ text: document.querySelector(".island-context")?.innerText ?? "", ring: !!document.querySelector(".island-ring"), title: document.querySelector(".post-detail-title").textContent })`);
  assert.ok(reading.ring && reading.text.includes(reading.title.slice(0, 6)), `读文章时胶囊应显示标题和进度环：${reading.text}`);

  await browser.goto(`${base}/debug`);
  await browser.evaluate(`[...document.querySelectorAll("li")].find((li) => li.querySelector("h2")?.textContent === "页头夜航岛").querySelector("button").click()`);
  await sleep(500);
  const activity = await island();
  assert.equal(activity.mode, "activity", "播报活动时应当变形");
  assert.match(activity.text, /熄灯了/);
  await sleep(3500);
  assert.notEqual((await island()).mode, "activity", "活动播完应当缩回");

  console.log(`PASS 夜航岛：铺开 ${bar.width}px → 收拢 ${compact.width}px → 悬停展开 ${expanded.width}px → 收回；读文章显示标题与进度环；活动播报后缩回`);
} finally {
  browser.close();
}
