// 站点语言的纯函数：浏览器首选语言怎么挑、地址怎么加/拆语言前缀；以及三份词典的键完全一致（类型检查之外再保险一次）。
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const ts = require('typescript')
const load = (path, requireMap = {}) => {
  const module = { exports: {} }
  const source = readFileSync(new URL(`../apps/web/${path}`, import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports, require: (id) => requireMap[id] ?? require(id) })
  return module.exports
}
const { pickLocale, splitLocale, localizeHref } = load('lib/i18n/config.ts')

// Accept-Language：按 q 权重挑第一个支持的语言，地区后缀不影响；都不支持时返回 null（由调用方退回中文）
assert.equal(pickLocale('ja,en-US;q=0.9,en;q=0.8'), 'ja')
assert.equal(pickLocale('en-US,en;q=0.9'), 'en')
assert.equal(pickLocale('zh-CN,zh;q=0.9,en;q=0.8'), 'zh')
assert.equal(pickLocale('zh-TW'), 'zh')
assert.equal(pickLocale('fr-FR,fr;q=0.9,ja;q=0.5,en;q=0.4'), 'ja', '不支持的语言跳过，按权重取下一个')
assert.equal(pickLocale('en;q=0.2,ja;q=0.8'), 'ja', '权重高的优先，与书写顺序无关')
assert.equal(pickLocale('en;q=0,ja'), 'ja', 'q=0 表示不要')
assert.equal(pickLocale('fr,de'), null)
assert.equal(pickLocale(''), null)
assert.equal(pickLocale(null), null)

assert.deepEqual({ ...splitLocale('/en/posts') }, { locale: 'en', path: '/posts' })
assert.deepEqual({ ...splitLocale('/ja') }, { locale: 'ja', path: '/' })
assert.deepEqual({ ...splitLocale('/posts') }, { locale: null, path: '/posts' })
assert.deepEqual({ ...splitLocale('/english/x') }, { locale: null, path: '/english/x' }, '只认完整的一段')

assert.equal(localizeHref('/posts', 'zh'), '/posts', '中文不加前缀')
assert.equal(localizeHref('/posts?tag=a', 'en'), '/en/posts?tag=a')
assert.equal(localizeHref('/', 'ja'), '/ja')
assert.equal(localizeHref('https://example.com', 'en'), 'https://example.com', '站外地址不动')
assert.equal(localizeHref('//cdn.example.com/x', 'en'), '//cdn.example.com/x')
assert.equal(localizeHref('#comments', 'en'), '#comments')

// 三份词典结构一致：键、嵌套层级、是否为函数都要相同
const zh = load('lib/i18n/messages/zh.ts').default
const shape = (value) => typeof value === 'function' ? 'fn' : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, shape(value[key])])) : typeof value
for (const locale of ['en', 'ja']) {
  const messages = load(`lib/i18n/messages/${locale}.ts`, { './zh': { default: zh } }).default
  assert.deepEqual(shape(messages), shape(zh), `${locale} 词典与中文结构不一致`)
}
console.log('PASS i18n locale picking, path prefixes and dictionary shapes')
