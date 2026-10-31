// 浏览器回归测试：⌘K / Ctrl+K 搜索弹窗（components/command-search.tsx）。
// 检查：① 真实按键 ⌘K 打开、光标在输入框，空着时列出去处和“切换主题”；② 输入后文章、手记一起搜，标题里命中的词被标出；
// ③ ↓ 移动选中、回车跳到选中的那篇；④ Ctrl+K 也能打开，Esc 关闭；⑤ 页头放大镜打开同一个；⑥ /en 页面文案是英文、结果链接带 /en 前缀；
// ⑦ 手机上从全屏菜单里的放大镜打开。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser, sleep } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const browser = await openBrowser({ port: 9367 });

// CDP 的修饰键：Ctrl 2、Meta 4
async function pressK(modifiers) {
  for (const type of ["keyDown", "keyUp"]) await browser.send("Input.dispatchKeyEvent", { type, modifiers, key: "k", code: "KeyK", windowsVirtualKeyCode: 75 });
  await sleep(500);
}
async function press(key, code = key, keyCode = 0) {
  for (const type of ["keyDown", "keyUp"]) await browser.send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: keyCode });
  await sleep(200);
}
const dialog = () => browser.evaluate(`(() => {
  const popup = document.querySelector(".search-dialog");
  if (!popup) return null;
  return {
    focused: document.activeElement === popup.querySelector("input"),
    placeholder: popup.querySelector("input").placeholder,
    groups: [...popup.querySelectorAll(".search-group-label")].map((label) => label.textContent),
    items: [...popup.querySelectorAll(".search-item")].map((item) => ({ text: item.textContent, href: item.getAttribute("href"), selected: item.getAttribute("aria-selected") === "true" })),
    marks: [...popup.querySelectorAll("mark")].map((mark) => mark.textContent),
  };
})()`);

try {
  await browser.setViewport(1920, 991);
  await browser.goto(`${base}/posts`);

  await pressK(4);
  const empty = await dialog();
  assert.ok(empty, "⌘K 没有打开搜索弹窗");
  assert.ok(empty.focused, "打开后光标应在输入框里");
  assert.deepEqual(empty.groups, ["去处", "操作"], `空着时应列出去处和操作：${empty.groups}`);
  assert.ok(empty.items.some((item) => item.href === "/posts") && empty.items.some((item) => item.text.includes("切换")), "去处里应有文章，操作里应有切换主题");

  await browser.send("Input.insertText", { text: "Vue" });
  await sleep(2500);
  const found = await dialog();
  assert.equal(found.groups[0], "文章", `搜索结果应先列文章：${found.groups}`);
  assert.ok(found.items.length > 1 && found.items.every((item) => item.href?.startsWith("/posts/") || item.href?.startsWith("/notes")), `结果应是文章或手记链接：${JSON.stringify(found.items)}`);
  assert.ok(found.marks.some((mark) => /vue/i.test(mark)), "标题里命中的 Vue 应被标出");
  assert.ok(found.items[0].selected, "默认选中第一条");

  await press("ArrowDown", "ArrowDown", 40);
  const moved = await dialog();
  assert.ok(moved.items[1].selected && !moved.items[0].selected, "↓ 应选中第二条");
  const target = moved.items[1].href;
  await press("Enter", "Enter", 13);
  await sleep(2500);
  assert.equal(decodeURIComponent(await browser.evaluate("location.pathname")), decodeURIComponent(target), "回车应跳到选中的那篇");
  assert.equal(await dialog(), null, "跳转后弹窗应关掉");

  await pressK(2);
  assert.ok(await dialog(), "Ctrl+K 也应打开");
  await press("Escape", "Escape", 27);
  await sleep(400);
  assert.equal(await dialog(), null, "Esc 应关闭");

  await browser.evaluate(`document.querySelector(".site-header .search-trigger").click()`);
  await sleep(500);
  assert.ok(await dialog(), "页头放大镜应打开搜索");
  await press("Escape", "Escape", 27);

  await browser.goto(`${base}/en/posts`);
  await pressK(4);
  await browser.send("Input.insertText", { text: "React" });
  await sleep(2500);
  const en = await dialog();
  assert.match(en.placeholder, /Search/, `英文页面的输入框提示应是英文：${en.placeholder}`);
  assert.ok(en.items.length && en.items.every((item) => item.href?.startsWith("/en/")), `英文页面的结果链接应带 /en：${JSON.stringify(en.items.map((item) => item.href))}`);

  // ⑦ 手机上页头没有工具区：从全屏菜单底部的放大镜打开，菜单收起
  await browser.setViewport(390, 844);
  await browser.goto(`${base}/posts`);
  await browser.evaluate(`document.querySelector(".mobile-menu-trigger").click()`);
  await sleep(600);
  await browser.evaluate(`document.querySelector(".mobile-menu-bottom .icon-button").click()`);
  await sleep(800);
  assert.ok(await dialog(), "手机菜单里的放大镜应打开搜索");
  assert.equal(await browser.evaluate(`!!document.querySelector(".mobile-menu-bottom")`), false, "打开搜索时手机菜单应收起");

  assert.deepEqual(browser.errors, [], `页面报错：${browser.errors.join("\n")}`);
  console.log(`PASS ⌘K/Ctrl+K 打开与 Esc 关闭、去处与切换主题、搜“Vue”得到 ${found.items.length} 条并标出命中词、↓ + 回车跳到 ${decodeURIComponent(target)}、页头放大镜、英文文案与 /en 链接、手机菜单入口`);
} finally {
  browser.close();
}
