import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')
const source = readFileSync(new URL('../apps/web/components/post-detail.tsx', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
let failure
let request
const post = { title: '测试', created: '2026-10-22T00:00:00Z', category: { name: '学习', slug: 'study&think' }, text: '## 标题\n\n- 条目\n\n```js\nconst x = 1\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n[链接](https://example.com)\n\n[危险](javascript:alert(1))\n\n<script>alert(1)</script>' }
const module = { exports: {} }
vm.runInNewContext(code, {
  module, exports: module.exports,
  require: (id) => id.endsWith('.css') ? {} : id === '../lib/date' ? { formatDate: (v) => String(v) } : id === './notifications' ? { ArticleNotifications: () => null } : id === '../lib/blog-data' ? { getPost: async (...args) => { request = args; if (failure) throw failure; return post } } : require(id),
})
const render = (category = 'study%26think', slug = 'test') => module.exports.default({ params: Promise.resolve({ category, slug }) })
const html = renderToStaticMarkup(await render())
assert.deepEqual(Array.from(request), ['study%26think', 'test'])
assert.ok(html.includes('<h2>标题</h2>') && html.includes('<li>条目</li>'))
assert.ok(html.includes('<table>') && html.includes('<pre>'))
assert.ok(html.includes('href="https://example.com"'))
assert.equal(html.includes('<script'), false)
assert.equal(html.includes('href="javascript:'), false)
post.contentFormat = 'lexical'
assert.ok(renderToStaticMarkup(await render()).includes('简化阅读版'))
delete post.text
assert.ok(renderToStaticMarkup(await render()).includes('暂时没有可展示的正文'))
failure = { status: 404 }
await assert.rejects(render(), (error) => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404')
failure = new Error('network')
const errorView = await render()
assert.equal(errorView.props.role, 'alert')
assert.equal(errorView.props.children[1].props.href, '/posts/study%26think/test')
await assert.rejects(render('%zz'), (error) => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404')
console.log('PASS detail routes, Markdown/GFM, HTML/script safety, simplified reading,404 and retry')
