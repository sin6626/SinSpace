import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const root = new URL('../../', import.meta.url)
const source = readFileSync(new URL('core/src/modules/debug/debug.controller.ts', root), 'utf8')
const body = source.split('sendToast(@Request() request: FastifyRequest) {')[1].split("\n  @Get('/test')")[0].replace(/\n  }\s*$/, '')
let calls = 0
class NotFoundException extends Error {}
function run(env, address) {
  const context = { process: { env: { NODE_ENV: env } }, request: { raw: { socket: { remoteAddress: address } } }, NotFoundException, BusinessEvents: { POST_CREATE: 'POST_CREATE' }, gateway: { broadcast(event, payload) { assert.equal(event, 'POST_CREATE'); assert.equal(payload.isPublished, true); calls++ } } }
  return vm.runInNewContext(`(function(){${body}}).call({webGateway:gateway})`, context)
}
assert.equal(run('development', '127.0.0.1').sent, true)
for (const [env, address] of [['production','127.0.0.1'],['development','192.168.1.2'],['development',undefined]]) assert.throws(()=>run(env,address),NotFoundException)
assert.equal(calls,1)
assert.match(source, /@Post\('\/toast'\)\s+@UseGuards\(AuthGuard\)/)
console.log('PASS local development test notification, production/remote rejection and authentication guard')
