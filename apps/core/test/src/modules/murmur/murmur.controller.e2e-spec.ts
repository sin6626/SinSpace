import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import type { ReturnModelType } from '@typegoose/typegoose'
import { createE2EApp } from 'test/helper/create-e2e-app'
import { authPassHeader } from 'test/mock/guard/auth.guard'

import { apiRoutePrefix } from '~/common/decorators/api-controller.decorator'
import { ConfigsService } from '~/modules/configs/configs.service'
import { FileReferenceModel, FileReferenceStatus } from '~/modules/file/file-reference.model'
import { FileReferenceService } from '~/modules/file/file-reference.service'
import { MurmurController } from '~/modules/murmur/murmur.controller'
import { MurmurModel } from '~/modules/murmur/murmur.model'
import { MurmurService } from '~/modules/murmur/murmur.service'
import { EventManagerService } from '~/processors/helper/helper.event.service'

// 碎碎念：增删改查、迁移时保留原时间、正文图片登记为已引用（否则会被每小时的清理任务删掉）。
describe('test /murmurs', () => {
  let app: NestFastifyApplication
  let fileReferences: ReturnModelType<typeof FileReferenceModel>
  const url = `${apiRoutePrefix}/murmurs`
  const image = 'https://s3.example.com/dev/image/a.webp'

  const proxy = createE2EApp({
    controllers: [MurmurController],
    providers: [
      MurmurService,
      FileReferenceService,
      { provide: ConfigsService, useValue: {} },
      { provide: EventManagerService, useValue: { async emit() {} } },
    ],
    models: [MurmurModel, FileReferenceModel],
    async pourData(modelMap) {
      fileReferences = modelMap.get(FileReferenceModel)!.model as ReturnModelType<typeof FileReferenceModel>
    },
  })

  beforeEach(() => {
    app = proxy.app
  })

  const reference = () => fileReferences.findOne({ fileUrl: image }).lean()

  test('writing needs auth and non-empty content', async () => {
    expect((await app.inject({ method: 'POST', url, payload: { content: 'hi' } })).statusCode).toBe(401)
    expect((await app.inject({ method: 'POST', url, headers: authPassHeader, payload: { content: '  ' } })).statusCode).toBe(422)
  })

  test('create keeps a given created time and lists newest first', async () => {
    const old = await app.inject({ method: 'POST', url, headers: authPassHeader, payload: { content: '旧的一条', created: '2026-10-01T08:00:00.000Z' } })
    expect(old.statusCode).toBe(201)
    expect(old.json().created).toBe('2026-10-01T08:00:00.000Z')
    await app.inject({ method: 'POST', url, headers: authPassHeader, payload: { content: '新的一条' } })

    const list = await app.inject({ method: 'GET', url: `${url}?page=1&size=1` })
    expect(list.statusCode).toBe(200)
    const body = list.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].content).toBe('新的一条')
    expect(body.pagination.total).toBe(2)
    expect(body.pagination.has_next_page).toBe(true)
  })

  test('images in content are marked as referenced, and released on edit and delete', async () => {
    await fileReferences.create({ fileUrl: image, fileName: 'a.webp', status: FileReferenceStatus.Pending })

    const created = await app.inject({ method: 'POST', url, headers: authPassHeader, payload: { content: `看图\n\n![](${image} "w=40%")` } })
    const { id } = created.json()
    expect(await reference()).toMatchObject({ status: FileReferenceStatus.Active, refId: id, refType: 'murmur' })

    const updated = await app.inject({ method: 'PUT', url: `${url}/${id}`, headers: authPassHeader, payload: { content: '不要图了' } })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().modified).toBeTruthy()
    expect((await reference())?.status).toBe(FileReferenceStatus.Pending)

    await app.inject({ method: 'PUT', url: `${url}/${id}`, headers: authPassHeader, payload: { content: `![](${image})` } })
    expect((await reference())?.status).toBe(FileReferenceStatus.Active)

    expect((await app.inject({ method: 'DELETE', url: `${url}/${id}`, headers: authPassHeader })).statusCode).toBe(204)
    expect((await reference())?.status).toBe(FileReferenceStatus.Pending)
    expect((await app.inject({ method: 'GET', url: `${url}/${id}` })).statusCode).toBe(404)
  })
})
