import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

// 检查渲染前的 Lexical 整理：段落/标题里的块级节点提到同一层，合法内容原样不变。
const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const ts = require('typescript')
const source = readFileSync(new URL('../apps/web/lib/lexical-normalize.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const module = { exports: {} }
vm.runInNewContext(code, { module, exports: module.exports })
const { normalizeEditorState } = module.exports

const text = (value) => ({ type: 'text', text: value, version: 1 })
const para = (children, extra = {}) => ({ type: 'paragraph', version: 1, format: '', indent: 0, direction: null, children, ...extra })
const state = (children) => ({ root: { type: 'root', version: 1, format: '', indent: 0, direction: null, children } })
const types = (nodes) => Array.from(nodes, (node) => node.type)
const plain = (value) => JSON.parse(JSON.stringify(value))

// 1. 整篇包在一个段落里（Shouping 那篇）：块级节点全部提出来，不留空段落。
const alert = { type: 'alert-quote', version: 1, alertType: 'note', content: state([para([{ type: 'heading', tag: 'h3', version: 1, children: [text('嵌套')] }])]) }
const wrapped = normalizeEditorState(state([para([alert, { type: 'heading', tag: 'h2', version: 1, children: [text('标题')] }, para([text('正文')], { $: { blockId: 'inner' } }), { type: 'image', version: 1, src: 'a.png' }], { $: { blockId: 'outer' } })]))
assert.deepEqual(types(wrapped.root.children), ['alert-quote', 'heading', 'paragraph', 'image'])
assert.equal(wrapped.root.children[2].$.blockId, 'inner')
// 提示块里的子文档也被整理：嵌套的段落>标题被拆开。
assert.deepEqual(types(wrapped.root.children[0].content.root.children), ['heading'])

// 2. 段落里放了块级公式（View Transitions 那篇）：前后的行内内容各自成段，只有第一段保留 blockId。
const formula = normalizeEditorState(state([para([text('前'), { type: 'linebreak', version: 1 }, { type: 'katex-block', version: 1, equation: 'x' }, text('后')], { $: { blockId: 'p1' } })]))
assert.deepEqual(types(formula.root.children), ['paragraph', 'katex-block', 'paragraph'])
assert.deepEqual(types(formula.root.children[0].children), ['text', 'linebreak'])
assert.equal(formula.root.children[0].$.blockId, 'p1')
assert.equal('$' in formula.root.children[2], false)

// 3. 合法内容（含行内公式、链接、空段落）原样返回，不复制对象。
const valid = state([para([text('a'), { type: 'katex-inline', version: 1, equation: 'y' }, { type: 'link', version: 1, url: 'https://x', children: [text('链接')] }]), para([]), { type: 'list', version: 1, children: [{ type: 'listitem', version: 1, children: [text('项')] }] }])
const snapshot = plain(valid)
assert.equal(normalizeEditorState(valid), valid)
assert.deepEqual(plain(valid), snapshot, '不修改输入')

console.log('PASS lexical normalize lifts block nodes out of paragraphs/headings, keeps first blockId, nested states and valid content untouched')
