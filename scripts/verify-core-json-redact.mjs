// 检查 apps/core 的 redactJson：Redis 事件日志里的配置 JSON 不能带出密钥原文。
// 2026-10-29 的 bug：后台保存 OAuth 设置时，RedisSubPub 的“发布事件/接收事件”调试日志把 GitHub、Google 的 clientSecret 原样写进 .local/logs/core.log。
// 用法：node scripts/verify-core-json-redact.mjs（pnpm verify）
import assert from "node:assert/strict";
import { redactJson } from "../apps/core/src/utils/log-url.util.ts";

const payload = JSON.stringify({
  providers: [{ type: "github", enabled: true }],
  secrets: { github: { clientSecret: "gh-secret-value" }, google: { clientSecret: "GOCSPX-value" } },
  public: { github: { clientId: "client-id-stays" } },
  mail: { pass: "smtp-pass", user: "me@example.com" },
  s3: { secretAccessKey: "s3-secret", accessKeyId: "AKIA-stays" },
  ai: { apiKey: "sk-value", api_key: "sk-value-2" },
  auth: { token: "jwt", password: 'p"w' },
});
const redacted = redactJson(payload);
for (const secret of ["gh-secret-value", "GOCSPX-value", "smtp-pass", "s3-secret", "sk-value", "jwt", 'p\\"w']) {
  assert.ok(!redacted.includes(secret), `日志里不应出现密钥原文：${secret}`);
}
for (const kept of ["client-id-stays", "me@example.com", "AKIA-stays", '"enabled":true']) {
  assert.ok(redacted.includes(kept), `非敏感字段应当保留：${kept}`);
}
assert.doesNotThrow(() => JSON.parse(redacted), "脱敏后仍应是合法 JSON");
console.log("PASS Redis 事件日志里的 secret/password/pass/token/apiKey 字段都被打码，其余原样保留");
