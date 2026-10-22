/**
 * Cache module.
 * @file Cache 全局模块
 * @module processor/cache/module
 */
import { once } from 'node:events'
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager'
import { Global, Module } from '@nestjs/common'
import type { Redis } from 'ioredis'

import { isTest } from '~/global/env.global'
import { redisSubPub } from '~/utils/redis-subpub.util'

import { CacheService } from './cache.service'
import { RedisConfigService } from './redis.config.service'
import { RedisService } from './redis.service'
import { SubPubBridgeService } from './subpub.service'

async function waitForReady(client: Redis) {
  if (client.status === 'ready') return
  try {
    await once(client, 'ready', { signal: AbortSignal.timeout(10000) })
  } catch (error) {
    client.disconnect()
    throw error
  }
}

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      useClass: RedisConfigService,
      inject: [RedisConfigService],
    }),
  ],
  providers: [
    RedisConfigService,
    CacheService,
    {
      provide: SubPubBridgeService,
      useFactory: async () => {
        if (!isTest) {
          await Promise.all(
            [redisSubPub.pubClient, redisSubPub.subClient].map(waitForReady),
          )
        }
        return new SubPubBridgeService()
      },
    },
    {
      provide: RedisService,
      useFactory: async () => {
        const service = new RedisService()
        await waitForReady(service.getClient())
        return service
      },
    },
  ],
  exports: [CacheService, SubPubBridgeService, RedisService],
})
export class RedisModule {}
