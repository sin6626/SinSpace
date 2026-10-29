import { Injectable } from '@nestjs/common'
import { BusinessEvents, EventScope } from '~/constants/business-event.constant'
import { FileReferenceType } from '~/modules/file/file-reference.model'
import { FileReferenceService } from '~/modules/file/file-reference.service'
import { EventManagerService } from '~/processors/helper/helper.event.service'
import { InjectModel } from '~/transformers/model.transformer'
import { scheduleManager } from '~/utils/schedule.util'
import { MurmurModel } from './murmur.model'

@Injectable()
export class MurmurService {
  constructor(
    @InjectModel(MurmurModel)
    private readonly murmurModel: MongooseModel<MurmurModel>,
    private readonly eventManager: EventManagerService,
    private readonly fileReferenceService: FileReferenceService,
  ) {}

  public get model() {
    return this.murmurModel
  }

  async getPaginated(page: number, size: number) {
    return this.murmurModel.paginate({}, { page, limit: size, sort: { created: -1 }, lean: true })
  }

  getOne(id: string) {
    return this.murmurModel.findById(id).lean()
  }

  // 正文里的图片要登记为已引用，否则 Core 每小时的清理任务会把上传超过 60 分钟、没人引用的图片删掉。
  private syncImages(doc: { id: string; content: string }) {
    return this.fileReferenceService.updateReferencesForDocument({ text: doc.content }, doc.id, FileReferenceType.Murmur)
  }

  async create({ content, created }: { content: string; created?: Date }) {
    const doc = (await this.murmurModel.create({ content, ...(created ? { created } : {}) })).toObject()
    await this.syncImages(doc)
    scheduleManager.schedule(() =>
      this.eventManager.emit(BusinessEvents.MURMUR_CREATE, doc, { scope: EventScope.TO_SYSTEM_VISITOR }),
    )
    return doc
  }

  async update(id: string, content: string) {
    const doc = await this.murmurModel.findByIdAndUpdate(id, { content, modified: new Date() }, { returnDocument: 'after' }).lean()
    if (!doc) return null
    await this.syncImages(doc)
    scheduleManager.schedule(() =>
      this.eventManager.emit(BusinessEvents.MURMUR_UPDATE, doc, { scope: EventScope.TO_SYSTEM_VISITOR }),
    )
    return doc
  }

  async delete(id: string) {
    const { deletedCount } = await this.murmurModel.deleteOne({ _id: id })
    if (deletedCount !== 1) return false
    await this.fileReferenceService.removeReferencesForDocument(id, FileReferenceType.Murmur)
    scheduleManager.schedule(() =>
      this.eventManager.emit(BusinessEvents.MURMUR_DELETE, { id }, { scope: EventScope.TO_SYSTEM_VISITOR }),
    )
    return true
  }
}
