// 站点主题配置：后台“附加功能 → 配置片段”里引用 theme、名称 sin-space 的 JSON 片段（getThemeConfig 读取）。
// 片段对访客公开，只放公开内容。后台手写 JSON 容易填错，这里逐项丢掉格式不对的，整块不可用时返回 null，由页面退回写死的默认值。
export type Tech = { name: string; icon: string };
export type TechStackConfig = { title?: string; description?: string; rows: Tech[][] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function parseTechStack(config: unknown): TechStackConfig | null {
  const value = isObject(config) ? config.techStack : undefined;
  if (!isObject(value) || !Array.isArray(value.rows)) return null;
  const rows = value.rows
    .map((row) => (Array.isArray(row) ? row : []).flatMap((item) => {
      const name = isObject(item) ? text(item.name) : undefined;
      const icon = isObject(item) ? text(item.icon) : undefined;
      return name && icon ? [{ name, icon }] : [];
    }))
    .filter((row) => row.length > 0);
  if (rows.length === 0) return null;
  return { title: text(value.title), description: text(value.description), rows };
}
