import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const root = new URL('../../', import.meta.url)
const source = readFileSync(new URL('core/src/modules/debug/debug.controller.ts', root), 'utf8')
const body = source.split("sendToast(@Request() request: FastifyRequest, @Body('event') event: unknown) {")[1].split("\n  @Get('/test')")[0].replace(/\n  }\s*$/, '')
let calls = 0
class NotFoundException extends Error {}
class BadRequestException extends Error {}
function run(env, address, event = 'POST_CREATE') {
  const context = { event, BadRequestException, process: { env: { NODE_ENV: env } }, request: { raw: { socket: { remoteAddress: address } } }, NotFoundException, BusinessEvents: { POST_CREATE: 'POST_CREATE', POST_UPDATE: 'POST_UPDATE', POST_DELETE: 'POST_DELETE' }, gateway: { broadcast(actual, payload) { assert.equal(actual, event); assert.equal(payload.isPublished, true); calls++ } } }
  return vm.runInNewContext(`(function(){${body}}).call({webGateway:gateway})`, context)
}
for (const event of ['POST_CREATE', 'POST_UPDATE', 'POST_DELETE']) assert.equal(run('development', '127.0.0.1', event).sent, true)
for (const event of ['COMMENT_CREATE', null, {}]) assert.throws(() => run('development', '127.0.0.1', event), BadRequestException)
for (const [env, address] of [['production','127.0.0.1'],['development','192.168.1.2'],['development',undefined]]) assert.throws(()=>run(env,address),NotFoundException)
assert.equal(calls,3)
assert.match(source, /@Post\('\/toast'\)\s+@UseGuards\(AuthGuard\)/)
console.log('PASS local development test notification, production/remote rejection and authentication guard')
