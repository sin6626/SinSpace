// 浏览器回归测试：文章目录下的操作栏（components/article-actions.tsx）与阅读胶囊里的日期、进度。
// ① 有喜欢、分享、回到顶部（后台开了订阅时还有订阅）；② 回到顶部在页面顶部时隐藏，往下读后出现，进度环跟着读的进度走；
// ③ 夜航岛阅读胶囊显示发布日期和百分比；④ 分享在电脑上复制链接并由夜航岛播报“链接已复制”；
// ⑤ 目录比屏幕长时目录自己滚动，操作栏仍在屏幕内；⑥ 侧栏的心和文末“喜欢这篇”共用状态（点赞请求在页面里用替身拦截，不写日常库）；⑦ 点回到顶部会回到页面顶端。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser, sleep } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const browser = await openBrowser({ port: 9340 });
const click = async (selector) => {
  const [x, y] = await browser.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
  await browser.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await browser.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
};

try {
  await browser.setViewport(1920, 991);
  await browser.send("Browser.grantPermissions", { origin: base, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
  await browser.goto(`${base}/timeline/posts`, 3000);
  // 优先用目录最长的富文本演示文章：目录比屏幕长时操作栏也必须留在屏幕里
  const post = await browser.evaluate(`(() => { const links = [...document.querySelectorAll(".timeline-list a")]; return (links.find((a) => a.href.includes("rich-text-components")) ?? links[0]).getAttribute("href"); })()`);
  await browser.goto(base + post);

  const top = await browser.evaluate(`({
    like: !!document.querySelector(".article-actions .is-like"),
    share: !!document.querySelector('.article-actions [aria-label^="分享"]'),
    topVisible: document.querySelector(".article-actions .is-top").hasAttribute("data-visible"),
  })`);
  assert.ok(top.like && top.share, `操作栏缺少按钮：${JSON.stringify(top)}`);
  assert.equal(top.topVisible, false, "在页面顶部时“回到顶部”应当隐藏");

  await browser.evaluate(`(() => { const a = document.querySelector("article"); const r = a.getBoundingClientRect(); scrollTo(0, scrollY + r.top + (r.height - innerHeight) * 0.5); })()`);
  await sleep(1200);
  const reading = await browser.evaluate(`({
    topVisible: document.querySelector(".article-actions .is-top").hasAttribute("data-visible"),
    ring: Number(document.querySelector(".article-action-ring-bar").getAttribute("stroke-dashoffset")) / Number(document.querySelector(".article-action-ring-bar").getAttribute("stroke-dasharray")),
    percent: document.querySelector(".island-percent")?.textContent ?? "",
    date: document.querySelector(".island-date")?.textContent ?? "",
    actionsBottom: document.querySelector(".article-actions").getBoundingClientRect().bottom,
  })`);
  assert.ok(reading.topVisible, "往下读后“回到顶部”应当出现");
  assert.ok(reading.actionsBottom <= 991, `目录很长时操作栏也应当在屏幕内（底边 ${reading.actionsBottom}）`);
  assert.ok(reading.ring > 0.2 && reading.ring < 0.8, `读到正文一半时进度环应当画了一半左右（剩余比例 ${reading.ring}）`);
  assert.match(reading.percent, /^\d+%$/, `阅读胶囊应当显示百分比：${reading.percent}`);
  assert.ok(Number.parseInt(reading.percent) > 20 && Number.parseInt(reading.percent) < 80, `读到正文一半时百分比应当在中间：${reading.percent}`);
  assert.match(reading.date, /^\d{2}\/\d{2}$/, `阅读胶囊应当显示发布日期：${reading.date}`);

  await click('.article-actions [aria-label^="分享"]');
  await sleep(500);
  const shared = await browser.evaluate(`(async () => ({ island: document.querySelector(".island").innerText, clip: await navigator.clipboard.readText() }))()`);
  assert.match(shared.island, /链接已复制/, `分享后夜航岛应当播报“链接已复制”：${shared.island}`);
  assert.ok(shared.clip.endsWith(decodeURI(post)) || decodeURI(shared.clip).endsWith(decodeURI(post)), `剪贴板应当是本文地址：${shared.clip}`);

  // 点赞：替身拦截 /activity/like（不写库），点侧栏的心，文末按钮也应当变成已喜欢
  const id = await browser.evaluate(`(() => {
    const original = window.fetch;
    window.fetch = (input, init) => String(input).endsWith("/activity/like") ? Promise.resolve(new Response("{}", { status: 200 })) : original(input, init);
    return Object.keys(localStorage).find((key) => key.startsWith("liked:")) ?? null;
  })()`);
  assert.equal(id, null, "测试前本地不应有点赞记录");
  await click(".article-actions .is-like");
  await sleep(800);
  const liked = await browser.evaluate(`({ aside: document.querySelector(".article-actions .is-like").getAttribute("aria-pressed"), end: document.querySelector(".like-button")?.textContent ?? "" })`);
  assert.equal(liked.aside, "true", "点侧栏的心后应当变成已喜欢");
  assert.match(liked.end, /谢谢你的喜欢/, `文末按钮应当同步变成已喜欢：${liked.end}`);
  await browser.evaluate(`Object.keys(localStorage).filter((key) => key.startsWith("liked:")).forEach((key) => localStorage.removeItem(key))`);

  await sleep(2500);
  await click(".article-actions .is-top");
  await sleep(1500);
  assert.ok(await browser.evaluate("scrollY") < 5, "点回到顶部后应当回到页面顶端");

  console.log(`PASS 文章操作栏：按钮齐全、回到顶部随进度出现（剩余 ${reading.ring.toFixed(2)}）、胶囊显示 ${reading.date} 与 ${reading.percent}、分享复制并播报、喜欢状态同步、回到顶部`);
} finally {
  browser.close();
}
