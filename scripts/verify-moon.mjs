import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

// 检查首页月相：已知的新月、满月、上下弦落在正确位置，亮面方向与新月/满月的特殊处理正确。
const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const ts = require('typescript')
const source = readFileSync(new URL('../apps/web/lib/moon.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const module = { exports: {} }
vm.runInNewContext(code, { module, exports: module.exports })
const { moonPhase, moonLitPath } = module.exports

const near = (phase, target) => Math.min(Math.abs(phase - target), 1 - Math.abs(phase - target))
// 2024-01-11 11:57 UTC 新月，2024-01-25 17:54 UTC 满月，2024-01-18 03:53 UTC 上弦，2024-02-02 23:18 UTC 下弦
assert.ok(near(moonPhase(Date.UTC(2024, 0, 11, 11, 57)), 0) < 0.03)
assert.ok(near(moonPhase(Date.UTC(2024, 0, 25, 17, 54)), 0.5) < 0.03)
assert.ok(near(moonPhase(Date.UTC(2024, 0, 18, 3, 53)), 0.25) < 0.03)
assert.ok(near(moonPhase(Date.UTC(2024, 1, 2, 23, 18)), 0.75) < 0.03)
assert.ok(moonPhase(Date.UTC(1990, 0, 1)) >= 0 && moonPhase(Date.UTC(1990, 0, 1)) < 1)

assert.equal(moonLitPath(0, 50, 50, 40), null)
assert.match(moonLitPath(0.5, 50, 50, 40), /A 40 40 0 1 1/)
// 上弦（右半亮）：外沿顺时针经过右侧；下弦外沿逆时针经过左侧
assert.match(moonLitPath(0.25, 50, 50, 40), /^M 50 10 A 40 40 0 0 1 50 90/)
assert.match(moonLitPath(0.75, 50, 50, 40), /^M 50 10 A 40 40 0 0 0 50 90/)
// 娥眉月交界线向亮面（右）鼓，盈凸月向暗面（左）鼓
assert.match(moonLitPath(0.1, 50, 50, 40), / 0 0 0 50 10 Z$/)
assert.match(moonLitPath(0.4, 50, 50, 40), / 0 0 1 50 10 Z$/)
console.log('PASS moon phase dates, lit side, crescent/gibbous terminator, new and full moon')
