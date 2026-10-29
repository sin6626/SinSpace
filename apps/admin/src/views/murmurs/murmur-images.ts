// 碎碎念正文里的图片：标准 Markdown 图片语法，显示宽度写在标题里 ![](地址 "w=40%")（占卡片宽度的百分比），100% 不写标题。
// 宽度不写在地址后面：Core 按原地址登记图片引用，地址变了会被当成没人用的图片清理掉。
// 编辑时文字和图片分开：文本框只放文字，图片在下面单独排、拖角缩放，保存时图片按顺序接在文字后面。
// 前台 apps/web 的碎碎念按同样的规则读宽度，改这里的格式要一起改。
export type MurmurImage = { alt: string; src: string; width: number }
export type Segment =
  | { kind: 'text'; text: string }
  | ({ kind: 'image' } & MurmurImage)

const IMAGE = /!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)/g
export const MIN_WIDTH = 10

export const clampWidth = (width: number) =>
  Math.min(100, Math.max(MIN_WIDTH, Math.round(width)))

export function widthOf(title: string | undefined) {
  const match = title?.match(/^w=(\d{1,3})%$/)
  return match ? clampWidth(Number(match[1])) : 100
}

export function splitContent(content: string): Segment[] {
  const segments: Segment[] = []
  let last = 0
  const pushText = (text: string) => {
    const trimmed = text.replace(/^\n+|\n+$/g, '')
    if (trimmed.trim()) segments.push({ kind: 'text', text: trimmed })
  }
  for (const match of content.matchAll(IMAGE)) {
    pushText(content.slice(last, match.index))
    segments.push({
      kind: 'image',
      alt: match[1],
      src: match[2],
      width: widthOf(match[3]),
    })
    last = match.index + match[0].length
  }
  pushText(content.slice(last))
  return segments
}

export const imageMarkdown = ({ alt, src, width }: MurmurImage) =>
  width >= 100
    ? `![${alt}](${src})`
    : `![${alt}](${src} "w=${clampWidth(width)}%")`

export function parseMurmur(content: string) {
  const text: string[] = []
  const images: MurmurImage[] = []
  for (const segment of splitContent(content)) {
    if (segment.kind === 'text') text.push(segment.text)
    else
      images.push({ alt: segment.alt, src: segment.src, width: segment.width })
  }
  return { text: text.join('\n\n'), images }
}

export const composeMurmur = (text: string, images: MurmurImage[]) =>
  [text.trim(), ...images.map(imageMarkdown)].filter(Boolean).join('\n\n')
