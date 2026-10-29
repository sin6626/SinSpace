// 浏览器回归测试：页头“夜航岛”（components/site-header.tsx）的几种状态。
// 顶部铺开（bar）；往下滚后——列表等普通页面保持深色导航条（expanded，导航一直可点），
// 阅读页（文章/手记/页面详情）收成“标题 + 阅读进度环”的小胶囊（compact），鼠标移上展开、移开收回；
// 在 /debug 播报一条活动（activity），播完缩回。（2026-10-29 用户定：只有真正在读时才收拢）
// 2026-10-28 的 bug：用鼠标点过页头里的东西（导航链接、主题按钮）后焦点留在页头，岛把“页头内有焦点”当成展开条件，
// 之后往下读文章时一直是展开状态、不收成标题 + 进度环。现在只有键盘聚焦（:focus-visible）才展开。
// 2026-10-29 的 bug：鼠标点过页头后，用键盘切到别的软件再切回（⌘+Tab、截图快捷键），浏览器把焦点还回来，
// 而且因为最后一次操作是键盘，这次聚焦算作 :focus-visible，岛又卡在展开。现在键盘聚焦只认 Tab 键，窗口失焦时清掉展开状态。
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

  // 列表页往下滚：保持深色导航条，导航一直可见
  await browser.evaluate("scrollTo(0, 500)");
  await sleep(900);
  const listBar = await island();
  assert.equal(listBar.mode, "expanded", `列表页往下滚应当保持导航条（现在是 ${listBar.mode}）`);
  assert.ok(listBar.navVisible, "列表页往下滚时导航应当可见");

  // 阅读页：先在顶部用真实鼠标点两下主题按钮（焦点留在按钮上），再按一下 ⌘ 模拟切走、让焦点回到按钮，然后往下读
  await browser.goto(`${base}/timeline/posts`, 3000);
  const post = await browser.evaluate(`document.querySelector(".timeline-list a").getAttribute("href")`);
  await browser.goto(base + post);
  const [tx, ty] = await browser.evaluate(`(() => { const r = document.querySelector(".theme-toggle").getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
  await move(tx, ty);
  for (let i = 0; i < 2; i++) {
    for (const type of ["mousePressed", "mouseReleased"]) await browser.send("Input.dispatchMouseEvent", { type, x: tx, y: ty, button: "left", clickCount: 1 });
    await sleep(700);
  }
  await move(960, 700);
  await browser.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Meta", code: "MetaLeft", windowsVirtualKeyCode: 91 });
  await browser.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Meta", code: "MetaLeft", windowsVirtualKeyCode: 91 });
  await browser.evaluate(`(() => { const el = document.activeElement; el.blur(); el.focus(); })()`);
  await browser.evaluate("scrollTo(0, document.documentElement.scrollHeight * 0.4)");
  await sleep(1200);
  const compact = await island();
  assert.equal(compact.mode, "compact", "阅读页往下读应当收成胶囊（点过页头按钮、切走再切回也一样）");
  assert.ok(compact.width < bar.width / 2 && !compact.navVisible, `阅读时的胶囊应当窄且不显示导航（宽 ${compact.width}）`);
  const reading = await browser.evaluate(`({ text: document.querySelector(".island-context")?.innerText ?? "", ring: !!document.querySelector(".island-ring"), title: document.querySelector(".post-detail-title").textContent })`);
  assert.ok(reading.ring && reading.text.includes(reading.title.slice(0, 6)), `读文章时胶囊应显示标题和进度环：${reading.text}`);

  await move(compact.x + compact.width / 2, 30);
  await sleep(900);
  const expanded = await island();
  assert.equal(expanded.mode, "expanded", "鼠标移上胶囊应当展开");
  assert.ok(expanded.navVisible, "展开后导航应当可见");

  await move(960, 700);
  await sleep(900);
  assert.equal((await island()).mode, "compact", "鼠标移开后应当收回");

  await browser.goto(`${base}/debug`);
  await browser.evaluate(`[...document.querySelectorAll("li")].find((li) => li.querySelector("h2")?.textContent === "页头夜航岛").querySelector("button").click()`);
  await sleep(500);
  const activity = await island();
  assert.equal(activity.mode, "activity", "播报活动时应当变形");
  assert.match(activity.text, /一条示例活动/);
  await sleep(3500);
  assert.notEqual((await island()).mode, "activity", "活动播完应当缩回");

  console.log(`PASS 夜航岛：铺开 ${bar.width}px；列表页往下滚保持导航条 ${listBar.width}px；读文章收成 ${compact.width}px（标题 + 进度环）→ 悬停展开 ${expanded.width}px → 收回；活动播报后缩回`);
} finally {
  browser.close();
}
