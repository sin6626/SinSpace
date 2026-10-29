import type { Pager } from './base'

// 碎碎念：站长随手记的闲话，正文是 Markdown，可以带图（宽度规则见 views/murmurs/murmur-images.ts）
export interface MurmurModel {
  id: string
  content: string
  created: string
  modified?: string | null
}

export interface MurmurResponse {
  data: MurmurModel[]
  pagination: Pager
}
