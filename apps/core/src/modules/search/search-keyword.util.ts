// SinPersonalSpace: 搜索关键词切分。
// - 按空白切分，并在汉字与非汉字交界处再切一次，"Nuxt学习" 与 "Nuxt 学习" 等价；
// - 转义正则特殊字符，"c++"、"(" 等按普通文字匹配，不会构造出非法正则。
const hanOrOther = /\p{Script=Han}+|[^\p{Script=Han}]+/gu

export function splitSearchKeyword(keyword: string): string[] {
  return keyword
    .split(/\s+/)
    .flatMap((item) => item.match(hanOrOther) ?? [])
    .filter(Boolean)
}

export function escapeRegExp(value: string) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

export function buildSearchKeywordRegexes(keyword: string): RegExp[] {
  return splitSearchKeyword(keyword).map(
    (item) => new RegExp(escapeRegExp(item), 'gi'),
  )
}
