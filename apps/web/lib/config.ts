import "server-only";

export function getApiUrl() {
  const value = process.env.MIX_SPACE_API_URL;
  if (!value) throw new Error("请配置 MIX_SPACE_API_URL，或使用根目录 pnpm dev 启动。");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("MIX_SPACE_API_URL 必须是无凭据、查询参数和片段的 HTTP(S) 地址。");
  }
  return url.href.replace(/\/$/, "");
}
