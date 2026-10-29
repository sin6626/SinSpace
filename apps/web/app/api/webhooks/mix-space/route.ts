import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";

const maxBodyBytes = 4 * 1024 * 1024;
// 后台勾选的事件 → 需要立即失效的缓存标签。不在表里的事件回 400，后台投递记录会显示失败。
// blog:categories 同时挂在导航、分类和文章列表上；blog:pages 挂在导航上。
const kindTags = {
  POST: ["blog:posts", "blog:categories"],
  NOTE: ["blog:notes"],
  PAGE: ["blog:pages"],
  CATEGORY: ["blog:categories"],
  TOPIC: ["blog:notes"],
  SAY: ["blog:says"],
  RECENTLY: ["blog:recently"],
  // 评论审核通过、置顶不发事件，靠 blog:comments 的短缓存兜底。
  COMMENT: ["blog:comments"],
  // Core 的事件枚举没有 PROJECT_*、LINK_*（友链只有 LINK_APPLY），只有后台勾选“全部事件”时才会收到；
  // 列在这里也让备份恢复（CONTENT_REFRESH）时一并失效。
  PROJECT: ["blog:projects"],
  LINK: ["blog:links"],
};
const eventTags = new Map<string, readonly string[]>(
  Object.entries(kindTags).flatMap(([kind, tags]) =>
    ["CREATE", "UPDATE", "DELETE"].map((action) => [`${kind}_${action}`, tags] as const),
  ),
);
// 备份恢复后 Core 发出 CONTENT_REFRESH，载荷是字符串 "restore_done"，全部公开缓存失效（含站名、订阅开关等站点设置和主题配置片段）。
const allTags = Array.from(new Set([...Object.values(kindTags).flat(), "blog:navigation", "blog:theme"]));

function revalidate(event: string, tags: readonly string[]) {
  try {
    for (const tag of tags) revalidateTag(tag, { expire: 0 });
  } catch (error) {
    unstable_rethrow(error);
    return Response.json({ error: "缓存失效失败" }, { status: 500 });
  }
  return Response.json({ event, revalidated: true });
}

export async function POST(request: Request) {
  const secret = process.env.MIX_SPACE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook 未配置" }, { status: 503 });

  const signature = request.headers.get("x-webhook-signature256");
  if (!signature || !/^[a-f\d]{64}$/i.test(signature)) {
    return Response.json({ error: "签名无效" }, { status: 401 });
  }

  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "请求体无效" }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBodyBytes) {
        await reader.cancel().catch(() => {});
        return Response.json({ error: "请求体过大" }, { status: 413 });
      }
      chunks.push(value);
    }
  } catch {
    return Response.json({ error: "请求体读取失败" }, { status: 400 });
  } finally {
    reader.releaseLock();
  }

  const body = Buffer.concat(chunks);
  const expected = createHmac("sha256", secret).update(body).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) {
    return Response.json({ error: "签名无效" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch {
    return Response.json({ error: "JSON 无效" }, { status: 400 });
  }
  const event = request.headers.get("x-webhook-event");
  if (event === "CONTENT_REFRESH") return revalidate(event, allTags);
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ error: "请求体必须是对象" }, { status: 400 });
  }
  if (event === "health_check") return Response.json({ event, revalidated: false });
  const tags = event ? eventTags.get(event) : undefined;
  if (!event || !tags) {
    return Response.json({ error: "不支持的事件" }, { status: 400 });
  }
  const id = "id" in payload ? payload.id : "_id" in payload ? payload._id : undefined;
  if (typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) {
    return Response.json({ error: "内容 ID 无效" }, { status: 400 });
  }
  return revalidate(event, tags);
}
