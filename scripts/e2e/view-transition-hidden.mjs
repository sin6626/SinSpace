// 浏览器回归测试：标签页在后台时发生路由更新，浏览器跳过视图过渡并抛出
// “InvalidStateError: Transition was aborted because of invalid state. Document hidden”（Chrome 155 加了后缀）。
// 修复前 Next 内置 React 逐字比对对不上，开发期左下角出现 1 个 Issue；补丁见 patches/next@16.4.2.patch、scripts/verify-next-patches.mjs。
// 无头浏览器里标签页不会真的进后台，这里把 document.startViewTransition 换成替身：照常执行更新，但 ready 用这条错误拒绝，
// 和后台标签页里浏览器的表现一致。然后点一次站内导航，检查没有 Issue、控制台也没有这条错误。
// 需先开 pnpm dev。用法：node scripts/e2e/view-transition-hidden.mjs（WEB_URL 可改地址）
import assert from 'node:assert/strict'
import { openBrowser, sleep } from '../headless-browser.mjs'
import { clickNav } from './helpers.mjs'

const base = process.env.WEB_URL ?? 'http://127.0.0.1:2323'
const b = await openBrowser({ port: 9351 })
try {
  await b.setViewport(1920, 991)
  await b.goto(`${base}/`)
  await b.evaluate(`(() => {
    window.__viewTransitions = 0
    document.startViewTransition = (options) => {
      window.__viewTransitions++
      const update = typeof options === 'function' ? options : options?.update
      const updateCallbackDone = Promise.resolve().then(() => update?.())
      const error = new DOMException('Transition was aborted because of invalid state. Document hidden', 'InvalidStateError')
      const ready = updateCallbackDone.then(() => Promise.reject(error))
      const finished = updateCallbackDone.then(() => undefined)
      ready.catch(() => {})
      return { ready, finished, updateCallbackDone, skipTransition() {}, types: new Set() }
    }
  })()`)
  const path = await b.evaluate(clickNav('/timeline'))
  assert.equal(path, '/timeline', '站内导航照常完成')
  await sleep(1500)
  assert.ok(await b.evaluate('window.__viewTransitions') >= 1, '导航应当走了视图过渡（替身被调用），否则这个测试什么也没测到')
  const issues = await b.evaluate(`(() => { const text = document.querySelector("nextjs-portal")?.shadowRoot?.textContent ?? ""; const match = text.match(/(\\d+)\\s*Issues?/); return match ? Number(match[1]) : 0; })()`)
  const hidden = b.errors.filter((error) => error.includes('Document hidden'))
  assert.deepEqual({ issues, hidden }, { issues: 0, hidden: [] }, '后台标签页跳过视图过渡不应当出现 Issue 或控制台错误')
  console.log('PASS 后台标签页跳过视图过渡（Document hidden）时不出现 Next Issue')
} finally {
  b.close()
}
