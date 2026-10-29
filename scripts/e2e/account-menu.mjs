// 浏览器回归测试：页头的读者登录入口（components/account-menu.tsx）。
// ① 没登录：页头有“登录”按钮，点开列出后台启用的登录方式；点“使用 GitHub 登录”时发给 Core 的登录方式、登录后回跳地址、
//    失败回跳地址（login=failed&login_provider=…）都正确；Core 出错时浮层里显示原因（请求用页面内替身拦截，不真的跳去授权）；
// ② 已登录（替身会话）：按钮显示头像（无图时显示名字首字），点开有名字、身份和“退出登录”；
// ③ 登录失败回来：夜航岛播报“登录没有成功”，地址栏去掉 login 等参数。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser, sleep } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const browser = await openBrowser({ port: 9346 });
const click = async (selector) => {
  const [x, y] = await browser.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
  await browser.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await browser.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
};
// 在页面脚本运行前替换 fetch：get-session 返回指定会话，sign-in/social 记下请求体并返回 500
const stub = (user) => browser.send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
  const original = window.fetch;
  window.fetch = (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/get-session")) return Promise.resolve(new Response(JSON.stringify(${JSON.stringify(user ? { user } : null)}), { status: 200, headers: { "Content-Type": "application/json" } }));
    if (url.endsWith("/auth/sign-in/social")) { window.__signIn = JSON.parse(init.body); return Promise.resolve(new Response(JSON.stringify({ message: "替身：不跳转" }), { status: 500 })); }
    return original(input, init);
  };
})()` });

try {
  await browser.setViewport(1920, 991);
  const guestScript = await stub(null);
  await browser.goto(`${base}/posts`);
  await click('.island-tools [aria-label="登录"]');
  await sleep(500);
  const providers = await browser.evaluate(`[...document.querySelectorAll(".account-provider")].map((b) => b.textContent)`);
  assert.ok(providers.includes("使用 GitHub 登录"), `登录浮层应当列出 GitHub：${providers}`);
  await click(".account-provider");
  await sleep(500);
  const request = await browser.evaluate("window.__signIn ?? null");
  assert.equal(request?.provider, "github");
  assert.equal(request.callbackURL, `${base}/posts`, `登录后应当回到发起登录的页面：${request.callbackURL}`);
  assert.equal(request.errorCallbackURL, `${base}/posts?login=failed&login_provider=github`, `失败回跳地址不对：${request.errorCallbackURL}`);
  assert.match(await browser.evaluate(`document.querySelector(".account-error")?.textContent ?? ""`), /替身：不跳转/, "Core 出错时浮层里应当显示原因");
  await browser.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: guestScript.identifier });

  // 登录失败回来：夜航岛播报，参数从地址栏去掉
  await browser.goto(`${base}/posts?login=failed&login_provider=google&error=access_denied`);
  await sleep(600);
  const failed = await browser.evaluate(`({ island: document.querySelector(".island").innerText, url: location.href })`);
  assert.match(failed.island, /登录没有成功/, `登录失败回来时夜航岛应当播报：${failed.island}`);
  assert.equal(failed.url, `${base}/posts`, `应当去掉地址栏里的登录参数：${failed.url}`);

  // 已登录（替身会话）
  await stub({ name: "测试读者", image: null, role: "reader" });
  await browser.goto(`${base}/posts`);
  const trigger = await browser.evaluate(`document.querySelector(".island-tools .account-trigger")?.getAttribute("aria-label") ?? ""`);
  assert.equal(trigger, "已登录：测试读者");
  await click(".island-tools .account-trigger");
  await sleep(500);
  const profile = await browser.evaluate(`({ name: document.querySelector(".account-name")?.textContent, role: document.querySelector(".account-role")?.textContent, logout: !!document.querySelector(".account-logout") })`);
  assert.deepEqual(profile, { name: "测试读者", role: "读者", logout: true });

  console.log(`PASS 页头登录入口：列出 ${providers.join("、")}；登录请求的回跳地址正确、出错显示原因；失败回来夜航岛播报并清掉参数；已登录显示头像、名字和退出`);
} finally {
  browser.close();
}
