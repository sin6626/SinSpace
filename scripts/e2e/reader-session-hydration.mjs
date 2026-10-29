// 浏览器回归测试：读者登录状态不能引起水合不一致。
// 2026-10-29 的 bug：reader-session.ts 的 useReaderSession 把“当前状态”当作服务端快照（getServerSnapshot）。
// 页头登录入口先水合并读到会话（变成“游客”）后，文末评论表单所在的 Suspense 才水合，它拿到的“服务端快照”已是游客，
// 而服务端实际输出的是“读取中”，于是 /notes/10 这类页面时有时无地报 “Hydration failed”。服务端快照必须恒为“读取中”。
// 做法：会话接口用替身立即返回，同一详情页整页打开几次，控制台不能出现 Hydration 报错。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const browser = await openBrowser({ port: 9350 });
try {
  await browser.setViewport(1920, 991);
  await browser.goto(`${base}/timeline/notes`, 3000);
  const note = await browser.evaluate(`document.querySelector(".timeline-list a")?.getAttribute("href")`);
  assert.ok(note, "时间线上没有手记");
  await browser.send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
    const original = window.fetch;
    window.fetch = (input, init) => String(input).endsWith("/auth/get-session") ? Promise.resolve(new Response("null", { status: 200 })) : original(input, init);
  })()` });
  const failures = [];
  for (let i = 0; i < 5; i++) {
    browser.errors.length = 0;
    await browser.goto(base + note, 3500);
    // 水合不一致由 React 作为未捕获异常抛出（不走 console.error），从无头浏览器收集的异常里找
    const errors = browser.errors.filter((error) => /Hydration failed/.test(error ?? ""));
    if (errors.length) failures.push(`第 ${i + 1} 次：${errors[0].slice(errors[0].indexOf("<form"), errors[0].indexOf("<form") + 200)}`);
  }
  assert.deepEqual(failures, [], `打开 ${note} 时出现水合不一致`);
  console.log(`PASS 读者登录状态不引起水合不一致：${note} 连续打开 5 次`);
} finally {
  browser.close();
}
