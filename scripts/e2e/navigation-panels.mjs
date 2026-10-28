// 浏览器回归测试：顶部导航的悬停面板（2026-10-28 仿 Innei 的面板式导航）。
// 检查：① 一级导航的顺序；② 悬停首页、文章、手记、时间线、更多都会弹出对应面板；
// ③ 首页面板“此间”的篇数和字数不是 0（Core 的 site_info 字段经 SDK 转成驼峰，读错字段名时会全是 0）；
// ④ 文章面板里鼠标移到另一个分类，右边的“X · 最近”跟着换；⑤ 弹层背景真的有模糊（backdrop-filter 曾被构建工具吞掉）。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser, sleep } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const browser = await openBrowser({ port: 9337 });

// 鼠标先停在导航下方再移到触发器上，等面板弹出并完成尺寸过渡
async function hover(label) {
  const [x, y] = await browser.evaluate(`(() => {
    const trigger = [...document.querySelectorAll(".navigation-List .navigation-Trigger")].find((t) => t.textContent.trim().startsWith(${JSON.stringify(label)}));
    const r = trigger.getBoundingClientRect();
    return [r.x + r.width / 2, r.y + r.height / 2];
  })()`);
  await browser.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y: y + 80 });
  await sleep(600);
  await browser.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await sleep(900);
}

try {
  await browser.setViewport(1920, 991);
  await browser.goto(`${base}/notes`);
  const order = await browser.evaluate(`[...document.querySelectorAll(".navigation-List .navigation-Trigger")].map((t) => t.textContent.trim()).filter((t) => t !== "调试")`);
  assert.deepEqual(order, ["首页", "文章", "手记", "时间线", "碎碎念", "更多"], `导航顺序不对：${order.join(" / ")}`);

  const panels = { 首页: "is-home", 文章: "is-posts", 手记: "is-notes", 时间线: "is-timeline", 更多: "is-more" };
  for (const [label, className] of Object.entries(panels)) {
    await hover(label);
    assert.equal(await browser.evaluate(`!!document.querySelector(".navigation-Popup .nav-panel.${className}")`), true, `悬停“${label}”没有弹出面板`);
  }

  await hover("首页");
  const stats = await browser.evaluate(`[...document.querySelectorAll(".nav-stats dd")].map((d) => Number(d.textContent))`);
  assert.ok(stats.length >= 2 && stats[0] > 0 && stats[1] > 0, `“此间”的数字不对：${stats.join(", ")}`);
  assert.notEqual(await browser.evaluate(`getComputedStyle(document.querySelector(".navigation-Popup")).backdropFilter`), "none", "弹层背景没有模糊");

  await hover("文章");
  const before = await browser.evaluate(`document.querySelector(".is-posts .nav-panel-main .nav-panel-label").textContent`);
  const [cx, cy, name] = await browser.evaluate(`(() => {
    const items = [...document.querySelectorAll(".is-posts .nav-categories li")];
    const other = items.find((li) => !li.hasAttribute("data-highlighted"));
    const r = other.getBoundingClientRect();
    return [r.x + 30, r.y + r.height / 2, other.querySelector(".nav-category-name").textContent];
  })()`);
  await browser.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: cx, y: cy });
  await sleep(400);
  const after = await browser.evaluate(`document.querySelector(".is-posts .nav-panel-main .nav-panel-label").textContent`);
  assert.equal(after, `${name} · 最近`, `移到“${name}”后右边没有跟着换（之前是 ${before}）`);

  console.log(`PASS 导航顺序、五个悬停面板、此间数字 ${stats.join("/")}、弹层模糊、文章面板随分类切换（${before} → ${after}）`);
} finally {
  browser.close();
}
