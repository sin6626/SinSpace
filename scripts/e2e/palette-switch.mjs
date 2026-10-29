// 浏览器回归测试：配色对比开关（2026-10-29，夜紫 / 墨黑二选一之前临时用，见 layout.tsx 的 themeScript）。
// 地址带 ?palette=ink 切到墨黑（<html data-palette="ink">，背景是中性的黑），之后站内点链接、整页打开别的页面都保持；
// ?palette=night 切回夜紫。记在 sessionStorage，所以只影响当前标签页，另开的标签页各自独立。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser, sleep } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const browser = await openBrowser({ port: 9361 });
const state = () => browser.evaluate(`({ palette: document.documentElement.dataset.palette ?? "night", background: getComputedStyle(document.body).backgroundColor })`);
// 背景是否“不带紫”：RGB 三个分量几乎相等（中性灰黑）
const neutral = (color) => { const [r, g, b] = color.match(/[\d.]+/g).map(Number); return Math.max(r, g, b) - Math.min(r, g, b) <= 3; };
try {
  await browser.setViewport(1920, 991);
  await browser.goto(`${base}/posts?palette=night`, 3500);
  const night = await state();
  assert.equal(night.palette, "night");
  assert.ok(!neutral(night.background), `夜紫的背景应当带紫：${night.background}`);

  await browser.goto(`${base}/posts?palette=ink`, 3500);
  const ink = await state();
  assert.equal(ink.palette, "ink", "带 ?palette=ink 应当切到墨黑");
  assert.ok(neutral(ink.background), `墨黑的背景应当是中性的黑：${ink.background}`);

  // 站内点导航（客户端跳转）后保持
  await browser.evaluate(`document.querySelector('.island-nav a[href="/notes"]').click()`);
  await sleep(2500);
  assert.equal((await state()).palette, "ink", "站内跳转后应当保持墨黑");
  // 同一标签页整页打开别的页面（地址里没有参数）也保持
  await browser.goto(`${base}/timeline`, 3500);
  assert.equal((await state()).palette, "ink", "同一标签页再打开别的页面应当保持墨黑");

  await browser.goto(`${base}/?palette=night`, 3500);
  assert.equal((await state()).palette, "night", "?palette=night 应当切回夜紫");
  await browser.goto(`${base}/posts`, 3500);
  assert.equal((await state()).palette, "night", "切回后再打开别的页面应当保持夜紫");
  console.log(`PASS 配色开关：?palette=ink 切到墨黑（背景 ${ink.background}），站内跳转与整页打开都保持，?palette=night 切回夜紫（背景 ${night.background}）`);
} finally {
  browser.close();
}
