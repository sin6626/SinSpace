// 检查 apps/core 的 guardUserInfo：第三方用户资料请求抛错时返回 null（Better Auth 据此跳回博客说明原因），成功时原样返回。
// 背景见 apps/core/src/modules/auth/guard-user-info.util.ts。用法：node scripts/verify-core-auth-userinfo.mjs（pnpm verify）
import assert from "node:assert/strict";
import { guardUserInfo } from "../apps/core/src/modules/auth/guard-user-info.util.ts";

const logs = [];
const ok = { id: "google", getUserInfo: async () => ({ user: { id: "1" } }) };
const broken = { id: "github", getUserInfo: async () => { throw new TypeError("fetch failed"); } };
guardUserInfo([ok, broken], (message) => logs.push(message));
assert.deepEqual(await ok.getUserInfo({}), { user: { id: "1" } }, "成功时应当原样返回");
assert.equal(await broken.getUserInfo({}), null, "网络出错时应当返回 null，而不是抛出变成 500");
assert.deepEqual(logs, ["[github] 获取第三方用户资料失败"], "出错时应当记一条日志");
console.log("PASS 第三方用户资料请求出错时转为 null，交给 Better Auth 跳回博客");
