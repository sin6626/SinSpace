import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

// Core 写日志前隐藏地址里的密码、令牌参数，其余参数和路径原样保留。
const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const ts = require('typescript')
const source = readFileSync(new URL('../apps/core/src/utils/log-url.util.ts', import.meta.url), 'utf8')
const module = { exports: {} }
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports })
const { redactUrl } = module.exports

assert.equal(redactUrl('/notes/nid/3?password=hunter2&single=1'), '/notes/nid/3?password=***&single=1')
assert.equal(redactUrl('/a?single=1&Password=x#top'), '/a?single=1&Password=***#top')
assert.equal(redactUrl('/auth/x?token=abc'), '/auth/x?token=***')
assert.equal(redactUrl('/subscribe/unsubscribe?email=a%40b.com&cancelToken=xyz'), '/subscribe/unsubscribe?email=***&cancelToken=***', '退订链接的邮箱与令牌')
assert.equal(redactUrl('/posts?page=2&passwordHint=keep'), '/posts?page=2&passwordHint=keep', '只匹配完整参数名')
assert.equal(redactUrl('/notes/password/1'), '/notes/password/1', '路径里的同名片段不处理')
console.log('PASS core log URLs hide password/token/secret/cancelToken/email query values and keep everything else')
