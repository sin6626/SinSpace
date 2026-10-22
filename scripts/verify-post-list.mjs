import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const ts = require('typescript')
const source = readFileSync(new URL('../apps/web/app/post-list.tsx', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
let request
let failure = false
const api = {
  category: { getAllCategories: async () => ({ data: [{ id: 'category-id', name: '学习', slug: 'study&think' }] }) },
  post: { getList: async (...args) => {
    request = args
    if (failure) throw new Error('unavailable')
    return { data: [], pagination: { total: 0, totalPage: 0, hasPrevPage: false, hasNextPage: false } }
  } },
}
const module = { exports: {} }
vm.runInNewContext(code, {
  module, exports: module.exports,
  require: (id) => id === '../lib/api' ? { getApiClient: () => api } : require(id),
})
const render = (page, slug) => module.exports.default({ searchParams: Promise.resolve(page === undefined ? {} : { page }), params: slug === undefined ? undefined : Promise.resolve({ slug }) })
const is404 = (error) => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404'
await render(undefined, 'study%26think')
assert.equal(request[0], 1)
assert.equal(request[1], 10)
assert.deepEqual(Array.from(request[2].categoryIds), ['category-id'])
for (const page of ['0', '-1', '1.5', 'abc', ['1', '2'], '999999999999999999']) await assert.rejects(render(page), is404)
await assert.rejects(render('1', 'missing'), is404)
await assert.rejects(render('1', '%zz'), is404)
await assert.rejects(render('2'), is404)
failure = true
const errorView = await render('1', 'study&think')
assert.equal(errorView.props.role, 'alert')
assert.equal(errorView.props.children[1].props.href, '/categories/study%26think')
console.log('PASS post list category selection, page validation, empty page,404 and error retry target')
