// 浏览器回归测试：装了 Dark Reader 扩展的读者打开本站不报水合错误（2026-10-30）。
// 扩展在页面一开始（document_start）就运行，React 水合前给带颜色的 SVG 图标（Lucide 都是 stroke="currentColor"）
// 加上 data-darkreader-inline-* 属性，水合时与服务端 HTML 对不上，Next 开发浮层报 “A tree hydrated but some attributes … didn't match”。
// 本站自带浅色/深色主题，用 <meta name="darkreader-lock"> 请 Dark Reader 不要接管。
// 这里用与扩展同版本的 npm 包 darkreader（同一套动态主题引擎）在页面一开始启用，模拟装了扩展的浏览器。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { openBrowser } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const require = createRequire(import.meta.url);
const darkReader = readFileSync(require.resolve("darkreader/darkreader.js"), "utf8");
const browser = await openBrowser({ port: 9363 });
try {
  await browser.setViewport(1920, 991);
  // 扩展的 document_start 时 <html> 已经存在；这里的注入脚本比它还早，等 <html> 出现再启用
  await browser.send("Page.addScriptToEvaluateOnNewDocument", { source: `${darkReader}
const enable = () => DarkReader.enable({ brightness: 100, contrast: 90, sepia: 10 });
if (document.documentElement) enable();
else new MutationObserver((_, observer) => { if (document.documentElement) { observer.disconnect(); enable(); } }).observe(document, { childList: true });` });
  const report = [];
  for (const path of ["/", "/posts", "/en/notes"]) {
    browser.errors.length = 0;
    await browser.goto(base + path, 5000);
    const state = await browser.evaluate(`({
      takenOver: document.documentElement.hasAttribute("data-darkreader-mode"),
      marked: document.querySelectorAll("[data-darkreader-inline-color], [data-darkreader-inline-stroke], [data-darkreader-inline-fill], [data-darkreader-inline-bgcolor]").length,
    })`);
    const hydration = browser.errors.filter((error) => /hydrat/i.test(error));
    assert.deepEqual(hydration, [], `${path} 有水合报错：\n${hydration.join("\n").slice(0, 1500)}`);
    assert.equal(state.marked, 0, `${path} 有 ${state.marked} 个元素被 Dark Reader 改了内联颜色`);
    assert.equal(state.takenOver, false, `${path} 被 Dark Reader 接管了配色`);
    report.push(path);
  }
  console.log(`PASS 启用 Dark Reader 时 ${report.join("、")} 没有水合报错，Dark Reader 不接管本站配色`);
} finally {
  browser.close();
}
