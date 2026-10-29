import type { IRequestAdapter } from '~/interfaces/adapter'
import type { IController } from '~/interfaces/controller'
import type { IRequestHandler } from '~/interfaces/request'
import type { MurmurModel } from '~/models/murmur'
import { autoBind } from '~/utils/auto-bind'
import type { HTTPClient } from '../core'
import type { PaginateResult } from '~/models/base'

declare module '../core/client' {
  interface HTTPClient<
    T extends IRequestAdapter = IRequestAdapter,
    ResponseWrapper = unknown,
  > {
    murmur: MurmurController<ResponseWrapper>
  }
}

export class MurmurController<ResponseWrapper> implements IController {
  base = 'murmurs'
  name = 'murmur'

  constructor(protected client: HTTPClient) {
    autoBind(this)
  }

  public get proxy(): IRequestHandler<ResponseWrapper> {
    return this.client.proxy(this.base)
  }

  getList(page = 1, size = 20) {
    return this.proxy.get<PaginateResult<MurmurModel>>({ params: { page, size } })
  }

  getById(id: string) {
    return this.proxy(id).get<MurmurModel>()
  }
}
