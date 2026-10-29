// 浏览器回归测试：读者登录（components/account-menu.tsx）。
// ① 没登录：页头“登录”按钮打开居中的登录弹窗（站名、每种登录方式一个圆形品牌按钮）；点 GitHub 时发给 Core 的登录方式、
//    登录后回跳地址、失败回跳地址（login=failed&login_provider=…）都正确；Core 出错时弹窗里显示原因（请求用页面内替身拦截，不真的跳去授权）；
// ② 评论区的“登录”打开同一个弹窗，登录后回到评论区（#comments）；
// ③ 登录失败回来：夜航岛播报“登录没有成功”，地址栏去掉 login 等参数；
// ④ 已登录（替身会话）：头像右下角有登录来源角标，点开账号菜单有名字、@用户名、“通过 GitHub 登录”、身份和“退出登录”。
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
const stub = (user, provider) => browser.send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
  const original = window.fetch;
  window.fetch = (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/get-session")) return Promise.resolve(new Response(JSON.stringify(${JSON.stringify(user ? { user, session: { provider } } : null)}), { status: 200, headers: { "Content-Type": "application/json" } }));
    if (url.endsWith("/auth/sign-in/social")) { window.__signIn = JSON.parse(init.body); return Promise.resolve(new Response(JSON.stringify({ message: "替身：不跳转" }), { status: 500 })); }
    return original(input, init);
  };
})()` });

try {
  await browser.setViewport(1920, 991);
  const guestScript = await stub(null).then((reply) => reply.result ?? reply);
  await browser.goto(`${base}/posts`);
  await click('.island-tools [aria-label="登录"]');
  await sleep(500);
  const providers = await browser.evaluate(`[...document.querySelectorAll(".login-dialog .login-provider")].map((b) => b.getAttribute("aria-label"))`);
  assert.ok(providers.includes("使用 GitHub 登录"), `登录弹窗应当列出 GitHub：${providers}`);
  assert.match(await browser.evaluate(`document.querySelector(".login-title")?.textContent ?? ""`), /^登录到 /, "登录弹窗应当写着“登录到 站名”");
  await click('.login-provider[aria-label="使用 GitHub 登录"]');
  await sleep(500);
  const request = await browser.evaluate("window.__signIn ?? null");
  assert.equal(request?.provider, "github");
  assert.equal(request.callbackURL, `${base}/posts`, `登录后应当回到发起登录的页面：${request.callbackURL}`);
  assert.equal(request.errorCallbackURL, `${base}/posts?login=failed&login_provider=github`, `失败回跳地址不对：${request.errorCallbackURL}`);
  assert.match(await browser.evaluate(`document.querySelector(".login-error")?.textContent ?? ""`), /替身：不跳转/, "Core 出错时弹窗里应当显示原因");

  // 评论区的“登录”打开同一个弹窗，登录后回到评论区
  await browser.goto(`${base}/timeline/posts`, 3000);
  const post = await browser.evaluate(`document.querySelector(".timeline-list a").getAttribute("href")`);
  await browser.goto(base + post);
  await browser.evaluate(`document.querySelector("#comments .comment-identity .btn").scrollIntoView({ block: "center" })`);
  await sleep(300);
  await click("#comments .comment-identity .btn");
  await sleep(500);
  await click('.login-provider[aria-label="使用 GitHub 登录"]');
  await sleep(500);
  const fromComments = await browser.evaluate("window.__signIn ?? null");
  assert.equal(fromComments?.callbackURL, `${base}${post}#comments`, `从评论区登录后应当回到评论区：${fromComments?.callbackURL}`);
  await browser.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: guestScript.identifier });

  // 登录失败回来：夜航岛播报，参数从地址栏去掉
  await browser.goto(`${base}/posts?login=failed&login_provider=google&error=access_denied`);
  await sleep(600);
  const failed = await browser.evaluate(`({ island: document.querySelector(".island").innerText, url: location.href })`);
  assert.match(failed.island, /登录没有成功/, `登录失败回来时夜航岛应当播报：${failed.island}`);
  assert.equal(failed.url, `${base}/posts`, `应当去掉地址栏里的登录参数：${failed.url}`);

  // 已登录（替身会话，GitHub 登录）
  await stub({ name: "测试读者", image: null, role: "reader", handle: "tester" }, "github");
  await browser.goto(`${base}/posts`);
  const trigger = await browser.evaluate(`({ label: document.querySelector(".island-tools .account-trigger")?.getAttribute("aria-label") ?? "", badge: !!document.querySelector(".island-tools .account-badge svg") })`);
  assert.deepEqual(trigger, { label: "账号：测试读者", badge: true }, "已登录时应当显示头像和登录来源角标");
  await click(".island-tools .account-trigger");
  await sleep(500);
  const profile = await browser.evaluate(`({ name: document.querySelector(".account-names strong")?.textContent, handle: document.querySelector(".account-names span")?.textContent, meta: document.querySelector(".account-meta")?.textContent, logout: document.querySelector(".account-item")?.textContent })`);
  assert.deepEqual(profile, { name: "测试读者", handle: "@tester", meta: "通过 GitHub 登录读者", logout: "退出登录" });

  console.log(`PASS 读者登录：弹窗列出 ${providers.join("、")}，回跳地址正确、出错显示原因；评论区打开同一弹窗并回到 #comments；失败回来夜航岛播报并清掉参数；已登录头像带来源角标，账号菜单有名字、@用户名、来源和退出`);
} finally {
  browser.close();
}
