import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const ts = require('typescript')
const source = readFileSync(new URL('../apps/web/lib/blog-data.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const lifetimes = [], tags = [], calls = []
const category = { id: 'category-id', name: '技术', slug: 'technology', type: 0, count: 1, created: '2026-10-22' }
const post = { id: 'post-id', title: '正文', text: 'body', slug: 'test', category, created: '2026-10-22', liked: true, content: 'unused JSON' }
let invalidNavigation = false
const api = {
  aggregate: { getAggregateData: async () => ({ categories: invalidNavigation ? null : [category], pageMeta: [], user: { privateField: 'not for cache' } }) },
  category: { getAllCategories: async () => ({ data: [category] }) },
  post: {
    getList: async (...args) => { calls.push(args); return { data: [post], pagination: { total: 1 } } },
    getPost: async () => post,
  },
}
const module = { exports: {} }
vm.runInNewContext(code, {
  module, exports: module.exports,
  require: (id) => id === 'server-only' ? {} : id === './api' ? { getApiClient: () => api } : id === 'next/cache' ? { cacheLife: (value) => lifetimes.push(value), cacheTag: (...value) => tags.push(...value) } : require(id),
})
const cache = module.exports
assert.equal('user' in await cache.getNavigationData(), false)
assert.equal((await cache.getCategories())[0].slug, 'technology')
const list = await cache.getPosts(2, 'category-id')
assert.equal(calls[0][0], 2)
assert.equal(calls[0][2].categoryIds[0], 'category-id')
assert.equal('liked' in list.data[0], false)
const detail = await cache.getPost('technology', 'test')
assert.equal('liked' in detail, false)
assert.equal('content' in detail, false)
assert.equal(detail.text, 'body')
assert.ok(tags.includes('blog:post:post-id'))
assert.equal(lifetimes.length, 4)
assert.ok(lifetimes.every(p => p.revalidate > 0 && p.expire > p.revalidate))
invalidNavigation = true
await assert.rejects(cache.getNavigationData(), /导航数据/)
console.log('PASS public cache projections, key parameters, tag coverage and lifetime constraints')
