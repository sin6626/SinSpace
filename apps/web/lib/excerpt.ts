// 把 Markdown 正文压成一行纯文本：去掉代码块、图片、链接地址、标题/引用/列表符号和强调符号，不追求完整解析。
export function plainText(markdown: string | null | undefined) {
  return (markdown ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/&#?\w+;/g, " ")
    // 引用符号只在行首去掉（可能嵌套），正文里提到的 <head>、a > b 保留
    .replace(/^\s{0,3}(?:(?:>\s*)+|(?:#{1,6}|[-*+]|\d+\.)\s+)/gm, "")
    // 删除线只去掉成对的 ~~，句尾单独的 ~~ 是语气，保留
    .replace(/~~(\S(?:.*?\S)?)~~/g, "$1")
    .replace(/[*_`|#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// 正文开头的摘录：用于列表没有摘要时兜底、首页碎碎念预览
export function excerpt(markdown: string | null | undefined, length = 90) {
  const text = plainText(markdown);
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

// 阅读时长（分钟）：按每分钟约 400 字估算（中文为主），至少 1 分钟
export const readingMinutes = (markdown: string | null | undefined) => Math.max(1, Math.round(plainText(markdown).length / 400));
