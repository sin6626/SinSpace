// 回归测试：读者登录出错时不能把人带到 Core（127.0.0.1:2333）。
// 2026-10-29 的 bug（10-26 也出现过）：用 GitHub 登录时 Core 连 GitHub 取用户资料的请求断了（fetch failed，未处理成 500），
// 回调被再次请求时登录状态已用掉（state_mismatch），这类没有前端失败地址的错误 Better Auth 会跳到它自带的 /auth/error 英文页，
// 页上“回首页”是 href="/"，也就是 Core 的根地址，于是读者看到一页 @mx-space/core 的 JSON。
// 现在 Core 的 onAPIError.errorURL 指向博客（后台“网站地址”）并带 login=failed，前端由夜航岛说明原因。
// 做法：直接用一个不存在的 state 请求 Core 的 GitHub 回调（只查询、不写库），看它跳去哪里。
// 需要先运行 pnpm dev（Core 默认 http://127.0.0.1:2333，可用 CORE_URL 覆盖；博客地址可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";

const core = process.env.CORE_URL ?? "http://127.0.0.1:2333";
const web = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const response = await fetch(`${core}/auth/callback/github?state=e2e-not-a-real-state&code=e2e`, { redirect: "manual" });
const location = response.headers.get("location") ?? "";
assert.ok(response.status >= 300 && response.status < 400, `回调出错时应当重定向（状态码 ${response.status}）`);
assert.ok(location.startsWith(`${web}/`), `登录出错应当回到博客，而不是 Core：${location}`);
const url = new URL(location);
assert.equal(url.searchParams.get("login"), "failed");
assert.equal(url.searchParams.get("error"), "state_mismatch");
console.log(`PASS 登录出错回到博客：${location}`);
