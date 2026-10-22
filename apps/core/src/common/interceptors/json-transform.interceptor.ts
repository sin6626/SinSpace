import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common'
import { BadRequestException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RESPONSE_PASSTHROUGH_METADATA } from '~/constants/system.constant'
import { snakecaseKeysWithCompat } from '~/utils/case.util'
import { LexicalService } from '~/processors/helper/helper.lexical.service'
import { isObjectLike } from 'es-toolkit/compat'
import { map, Observable } from 'rxjs'

@Injectable()
export class JSONTransformInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly lexical: LexicalService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const bypass = this.reflector.getAllAndOverride<boolean>(
      RESPONSE_PASSTHROUGH_METADATA,
      [context.getClass(), context.getHandler()],
    )

    if (bypass || !context.switchToHttp().getRequest()) {
      return next.handle()
    }

    return next.handle().pipe(map((data) => this.serialize(data)))
  }

  private serialize(obj: any, normalizeContent = true): any {
    if (!isObjectLike(obj)) {
      return obj
    }

    if (Array.isArray(obj)) {
      return Array.from(obj).map((i) => this.serialize(i, normalizeContent))
    }

    if (obj.toJSON || obj.toObject) {
      obj = obj.toJSON?.() ?? obj.toObject?.()
    }

    if (!isObjectLike(obj)) {
      return obj
    }

    obj = { ...obj }
    if (normalizeContent
      && (obj.contentFormat ?? obj.content_format) === 'lexical'
      && typeof obj.content === 'string') {
      const content = this.lexical.normalizeLegacyQuotes(obj.content)
      if (content !== obj.content) {
        try {
          const text = this.lexical.lexicalToMarkdown(content).trim()
          obj = { ...obj, content, text }
        } catch (error) {
          if (!(error instanceof BadRequestException)) throw error
        }
      }
    }
    Reflect.deleteProperty(obj, '__v')

    for (const key of Object.keys(obj)) {
      const val = obj[key]
      if (!isObjectLike(val)) {
        continue
      }

      if (val.toJSON) {
        obj[key] = val.toJSON()
        if (!isObjectLike(obj[key])) {
          continue
        }
        Reflect.deleteProperty(obj[key], '__v')
      }
      obj[key] = this.serialize(obj[key], normalizeContent && key !== 'history')
    }

    return snakecaseKeysWithCompat(obj)
  }
}
