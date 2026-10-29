import { modelOptions, prop } from '@typegoose/typegoose'
import { MURMUR_COLLECTION_NAME } from '~/constants/db.constant'
import { BaseModel } from '~/shared/model/base.model'

// 碎碎念：站长随手记下的闲话（问 AI 时遇到的新词、用自己的话讲出来的东西），正文是 Markdown，可以带图。
// 和一言（摘别人的句子）、速记/思考（引用网站卡片发表看法）分开，没有赞踩和评论。
@modelOptions({
  options: { customName: MURMUR_COLLECTION_NAME },
})
export class MurmurModel extends BaseModel {
  @prop({ required: true })
  content: string

  @prop()
  modified?: Date
}
