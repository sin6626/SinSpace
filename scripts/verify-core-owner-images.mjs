// 检查 apps/core 的 socialImageUrls：个人资料“社交链接”里微信、QQ 这类名片项的二维码图片地址要登记为已引用，
// 否则后台上传到图床的二维码一小时后会被清理任务删掉。只取对象值里 qr 字段的 http(s) 地址，去重。
// 用法：node scripts/verify-core-owner-images.mjs（pnpm verify）
import assert from "node:assert/strict";
import { socialImageUrls } from "../apps/core/src/modules/owner/owner-images.util.ts";

const qq = "https://s3.example.com/dev/qq.webp";
const wechat = "https://s3.example.com/dev/wechat.webp";
assert.deepEqual(socialImageUrls({ github: "sin6626", qq: { id: "3554989283", qr: qq }, wechat: { qr: wechat } }), [qq, wechat]);
assert.deepEqual(socialImageUrls({ qq: { id: "123" }, wechat: { qr: "javascript:alert(1)" }, x: { qr: 1 } }), [], "没有二维码、非 http(s)、非字符串都跳过");
assert.deepEqual(socialImageUrls({ a: { qr: qq }, b: { qr: qq } }), [qq], "同一张图只登记一次");
assert.deepEqual(socialImageUrls(undefined), []);
assert.deepEqual(socialImageUrls("github"), []);
console.log("PASS 个人资料里名片项的二维码地址会被登记为已引用（只取 http(s)、去重）");
