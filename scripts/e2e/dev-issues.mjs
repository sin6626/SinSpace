// 浏览器回归测试：开发模式下各页面不能出现 Next 的 Issue（左下角红色“N Issue”）或控制台路由报错。
// 背景（2026-10-28 的 bug）：/debug 一打开就报 “Next.js encountered URL data in generateMetadata()”。
// 根布局的 generateMetadata 读 getSiteSettings，它的缓存 stale 只有 60 秒，而 Next 只把 stale ≥ 5 分钟的缓存放进预渲染外壳，
// 于是 metadata 被当成动态数据；/debug 是唯一整页都静态的页面，Next 判断“只有 metadata 是动态的，多半写错了”就报错。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const pages = ["/", "/posts", "/notes", "/timeline", "/timeline/posts", "/projects", "/friends", "/thinking", "/debug"];

const browser = await openBrowser({ port: 9338 });
try {
  await browser.setViewport(1920, 991);
  const problems = [];
  for (const path of pages) {
    browser.errors.length = 0;
    await browser.goto(base + path, 4000);
    // Next 开发浮层在 nextjs-portal 的 shadow DOM 里，左下角徽标写着“N Issue(s)”
    const issues = await browser.evaluate(`(() => { const text = document.querySelector("nextjs-portal")?.shadowRoot?.textContent ?? ""; const match = text.match(/(\\d+)\\s*Issues?/); return match ? Number(match[1]) : 0; })()`);
    const routeErrors = browser.errors.filter((error) => /Route "|Next\.js encountered/.test(error));
    if (issues || routeErrors.length) problems.push(`${path}：${issues} 个 Issue ${routeErrors.map((error) => error.split("\n")[0]).join(" / ")}`);
  }
  assert.deepEqual(problems, [], `有页面出现 Next 开发期报错：\n${problems.join("\n")}`);
  console.log(`PASS 开发模式下 ${pages.length} 个页面没有 Next Issue 或路由报错`);
} finally {
  browser.close();
}
