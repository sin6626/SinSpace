import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";

const maxBodyBytes = 4 * 1024 * 1024;
const postEvents = new Set(["POST_CREATE", "POST_UPDATE", "POST_DELETE"]);

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
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ error: "请求体必须是对象" }, { status: 400 });
  }

  const event = request.headers.get("x-webhook-event");
  if (event === "health_check") return Response.json({ event, revalidated: false });
  if (!event || !postEvents.has(event)) {
    return Response.json({ error: "不支持的事件" }, { status: 400 });
  }
  const id = "id" in payload ? payload.id : "_id" in payload ? payload._id : undefined;
  if (typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) {
    return Response.json({ error: "文章 ID 无效" }, { status: 400 });
  }

  try {
    revalidateTag("blog:posts", { expire: 0 });
    revalidateTag("blog:categories", { expire: 0 });
  } catch (error) {
    unstable_rethrow(error);
    return Response.json({ error: "缓存失效失败" }, { status: 500 });
  }
  return Response.json({ event, revalidated: true });
}
