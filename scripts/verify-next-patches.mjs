import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

// Next 内置 React 的视图过渡补丁（pnpm-workspace.yaml 的 patchedDependencies，patches/next@16.4.2.patch）：
// 标签页在后台时发生路由更新（跳转、refresh、开发期热更新），浏览器会跳过视图过渡并抛出 InvalidStateError。
// React 本来把这条当作可忽略，但它按全文逐字比对，Chrome 155 在文字后面加了 “. Document hidden”，对不上就交给
// onRecoverableError，开发期左下角出现 “Recoverable InvalidStateError … Document hidden”。补丁把这一句改成“以这句开头”。
// 这里从 Next 实际用的 React 文件里取出那段判断直接调用。用法：node scripts/verify-next-patches.mjs（pnpm verify）
const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const next = dirname(require.resolve('next/package.json'))
const files = [
  'react-dom/cjs/react-dom-client.development.js',
  'react-dom/cjs/react-dom-client.production.js',
  'react-dom-experimental/cjs/react-dom-client.development.js',
  'react-dom-experimental/cjs/react-dom-client.production.js',
]

const invalidState = (message) => Object.assign(new Error(message), { name: 'InvalidStateError' })
for (const file of files) {
  const source = readFileSync(join(next, 'dist/compiled', file), 'utf8')
  // 开发版是单独的 customizeViewTransitionError，正式版内联在视图过渡的错误回调里；两种都是 case "InvalidStateError": if (条件) 忽略
  const match = source.match(/case "InvalidStateError":\s*if \(([\s\S]*?)\)\s*(?:return null|error = null);/)
  assert.ok(match, `${file} 里找不到忽略 InvalidStateError 的判断（Next 升级后要重新检查补丁）`)
  const ignored = new Function('error', `return (${match[1]})`)
  assert.equal(ignored(invalidState('Transition was aborted because of invalid state. Document hidden')), true, `${file}：Chrome 155 带 “. Document hidden” 后缀的这句应当被忽略`)
  assert.equal(ignored(invalidState('Transition was aborted because of invalid state')), true, `${file}：原来的写法仍然忽略`)
  assert.equal(ignored(invalidState('Something else went wrong')), false, `${file}：别的 InvalidStateError 照常上报`)
}
console.log(`PASS next ${require('next/package.json').version} bundled React ignores the "Document hidden" view transition abort (${files.length} files)`)
