import { Body, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common'
import { ApiController } from '~/common/decorators/api-controller.decorator'
import { Auth } from '~/common/decorators/auth.decorator'
import { HTTPDecorators, Paginator } from '~/common/decorators/http.decorator'
import { CannotFindException } from '~/common/exceptions/cant-find.exception'
import { MongoIdDto } from '~/shared/dto/id.dto'
import { MurmurDto, MurmurPagerDto } from './murmur.schema'
import { MurmurService } from './murmur.service'

@ApiController('murmurs')
export class MurmurController {
  constructor(private readonly murmurService: MurmurService) {}

  @Get('/')
  @Paginator
  getList(@Query() { page, size }: MurmurPagerDto) {
    return this.murmurService.getPaginated(page, size)
  }

  @Get('/:id')
  async getOne(@Param() { id }: MongoIdDto) {
    const doc = await this.murmurService.getOne(id)
    if (!doc) throw new CannotFindException()
    return doc
  }

  @Post('/')
  @HTTPDecorators.Idempotence()
  @Auth()
  create(@Body() body: MurmurDto) {
    return this.murmurService.create(body)
  }

  @Put('/:id')
  @Auth()
  async update(@Param() { id }: MongoIdDto, @Body() { content }: MurmurDto) {
    const doc = await this.murmurService.update(id, content)
    if (!doc) throw new CannotFindException()
    return doc
  }

  @Delete('/:id')
  @Auth()
  @HttpCode(204)
  async delete(@Param() { id }: MongoIdDto) {
    if (!(await this.murmurService.delete(id))) throw new CannotFindException()
  }
}
