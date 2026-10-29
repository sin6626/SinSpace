import type { BaseModel } from './base'

// 碎碎念：站长随手记的闲话，正文是 Markdown，可以带图（宽度写在图片标题里，如 ![](地址 "w=40%")）
export interface MurmurModel extends BaseModel {
  content: string
  modified?: string | null
}
