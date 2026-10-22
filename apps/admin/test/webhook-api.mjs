import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const require = createRequire(new URL('../package.json', import.meta.url))
const ts = require('typescript')
const source = readFileSync(new URL('../src/api/webhooks.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const calls = []
const request = {
  patch: (...args) => calls.push(['PATCH', ...args]),
  post: (...args) => calls.push(['POST', ...args]),
}
const module = { exports: {} }
vm.runInNewContext(code, {
  module, exports: module.exports,
  require: (id) => id === '~/utils/request' ? { request } : require(id),
})
module.exports.webhooksApi.test('hook-id')
module.exports.webhooksApi.redispatch('event-id')
assert.equal(JSON.stringify(calls), JSON.stringify([
  ['PATCH', '/webhooks/hook-id', { data: {} }],
  ['POST', '/webhooks/redispatch/event-id'],
]))
console.log('PASS admin health check and redispatch use existing Core routes')
