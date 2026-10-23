import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

// 检查 Core 搜索关键词切分：中英文交界切词、空白处理、正则特殊字符转义。
const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const ts = require('typescript')
const source = readFileSync(new URL('../apps/core/src/modules/search/search-keyword.util.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const module = { exports: {} }
vm.runInNewContext(code, { module, exports: module.exports })
const { splitSearchKeyword, buildSearchKeywordRegexes } = module.exports
const split = (value) => JSON.stringify(splitSearchKeyword(value))

assert.equal(split('Nuxt学习'), JSON.stringify(['Nuxt', '学习']))
assert.equal(split('Nuxt 学习'), split('Nuxt学习'))
assert.equal(split('  Vue3组件化  实践 '), JSON.stringify(['Vue3', '组件化', '实践']))
assert.equal(split('学习记录'), JSON.stringify(['学习记录']))
assert.equal(split('   '), '[]')
const matches = (keyword, text) => buildSearchKeywordRegexes(keyword).every((regex) => new RegExp(regex.source, 'i').test(text))
assert.ok(matches('Nuxt学习', 'Nuxt 学习记录：从 Vue 进阶到全栈框架'))
assert.ok(matches('c++', '我的 C++ 笔记'))
assert.ok(matches('(', '括号 ( 内容'))
assert.equal(matches('a.b', 'axb'), false)
assert.equal(matches('.*', '任意文字'), false)
console.log('PASS search keywords split Han/Latin boundaries, whitespace and escape regex characters')
