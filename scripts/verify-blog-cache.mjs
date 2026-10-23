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
const note = { id: 'note-id', nid: 5, title: '手记', text: 'note body', created: '2026-10-22', mood: '开心', weather: '晴', topic: { name: '近况', introduce: 'unused' }, password: 'secret', liked: true, content: 'unused JSON' }
const project = { id: 'project-id', name: '作品', description: '简介', avatar: 'https://example.com/a.png', text: 'unused', created: '2026-10-22' }
let invalidNavigation = false
const api = {
  aggregate: { getAggregateData: async () => ({ categories: invalidNavigation ? null : [category], pageMeta: [], user: { privateField: 'not for cache' } }) },
  category: { getAllCategories: async () => ({ data: [category] }) },
  note: {
    getList: async (...args) => { calls.push(args); return { data: [note], pagination: { total: 1 } } },
    getNoteByNid: async () => ({ data: note, prev: { nid: 6, title: '较新' }, next: { nid: 4 } }),
  },
  project: { getAll: async () => ({ data: [project] }) },
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
const notes = await cache.getNotes(3)
assert.equal(calls[1][0], 3)
assert.equal(notes.data[0].topic, '近况')
assert.equal('password' in notes.data[0] || 'text' in notes.data[0], false)
const noteDetail = await cache.getNote(5)
assert.equal('password' in noteDetail || 'liked' in noteDetail || 'content' in noteDetail, false)
assert.equal(JSON.stringify(noteDetail.newer), JSON.stringify({ nid: 6, title: '较新' }))
assert.equal(noteDetail.older, null)
assert.ok(tags.includes('blog:notes') && tags.includes('blog:note:note-id'))
const projects = await cache.getProjects()
assert.equal('text' in projects[0], false)
assert.ok(tags.includes('blog:projects'))
assert.equal(lifetimes.length, 7)
assert.ok(lifetimes.every(p => p.revalidate > 0 && p.expire > p.revalidate))
invalidNavigation = true
await assert.rejects(cache.getNavigationData(), /导航数据/)
console.log('PASS public cache projections, key parameters, tag coverage and lifetime constraints')
