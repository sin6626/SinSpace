// 把 Markdown 正文压成一行纯文本摘录：去掉代码块、图片、链接地址、标题/引用/列表符号和强调符号。
// 用于手记列表的“正文开头几行”和首页碎碎念预览，不追求完整解析。
export function excerpt(markdown: string | null | undefined, length = 90) {
  const text = (markdown ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/&#?\w+;/g, " ")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_`~|#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}
