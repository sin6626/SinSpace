import type { FastifyRequest } from "fastify"
import { AuthGuard } from "~/common/guards/auth.guard"
import { WebEventsGateway } from "~/processors/gateway/web/events.gateway"
import { Body, Get, Post, Query, Request, Response, NotFoundException, UseGuards } from '@nestjs/common'
import { ApiController } from '~/common/decorators/api-controller.decorator'
import { HTTPDecorators } from '~/common/decorators/http.decorator'
import { BusinessEvents, EventScope } from '~/constants/business-event.constant'
import { EventManagerService } from '~/processors/helper/helper.event.service'
import { createMockedContextResponse } from '../serverless/mock-response.util'
import { ServerlessService } from '../serverless/serverless.service'
import { SnippetModel, SnippetType } from '../snippet/snippet.model'
import { DebugService } from './debug.service'

@ApiController('debug')
export class DebugController {
  constructor(
    private readonly serverlessService: ServerlessService,
    private readonly eventManager: EventManagerService,

    private readonly debugService: DebugService,
    private readonly webGateway: WebEventsGateway,
  ) {}

  @Post('/toast')
  @UseGuards(AuthGuard)
  sendToast(@Request() request: FastifyRequest) {
    if (process.env.NODE_ENV !== 'development' ||
      !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.raw.socket.remoteAddress ?? '')) {
      throw new NotFoundException()
    }
    this.webGateway.broadcast(BusinessEvents.POST_CREATE, { isPublished: true })
    return { sent: true }
  }

  @Get('/test')
  test() {
    this.debugService.test()
    return ''
  }

  @Post('/events')
  async sendEvent(
    @Query('type') type: 'web' | 'admin' | 'all',
    @Query('event') event: BusinessEvents,
    @Body() payload: any,
  ) {
    Date.prototype.toJSON = function () {
      return this.toISOString()
    }
    payload.date = new Date()

    switch (type) {
      case 'web':
        this.eventManager.broadcast(event, payload, {
          scope: EventScope.TO_SYSTEM_VISITOR,
        })
        break
      case 'admin':
        this.eventManager.broadcast(event, payload, {
          scope: EventScope.TO_SYSTEM_ADMIN,
        })
        break
      case 'all':
        this.eventManager.broadcast(event, payload, { scope: EventScope.ALL })

        break
    }
  }

  @Post('/function')
  @HTTPDecorators.Bypass
  async runFunction(
    @Body('function') functionString: string,
    @Request() req,
    @Response() res,
  ) {
    const model = new SnippetModel()
    model.name = 'debug'
    model.raw = functionString
    model.private = false
    model.type = SnippetType.Function

    const result =
      await this.serverlessService.injectContextIntoServerlessFunctionAndCall(
        model,
        { req, res: createMockedContextResponse(res), isAuthenticated: true },
      )

    if (!res.sent) {
      return res.send(result)
    }
  }
}
