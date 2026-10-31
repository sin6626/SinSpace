// 社交图标悬停换成品牌色（2026-10-31 用户选定）：平时单色，鼠标移上去变成平台自己的颜色；
// 深色品牌（GitHub 等）熄灯时是品牌色圆底 + 白色图标，开灯时直接用品牌色。在 /debug 的“社交图标”里用真实首屏组件和导航面板样式测。
// 需先开 pnpm dev。用法：node scripts/e2e/social-icons.mjs（WEB_URL 可改地址）
import assert from 'node:assert/strict'
import { openBrowser, sleep } from '../headless-browser.mjs'

const base = process.env.WEB_URL ?? 'http://127.0.0.1:2323'
const b = await openBrowser({ port: 9354 })
const hover = async (selector) => {
  const box = await b.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y })
  await sleep(450)
  return b.evaluate(`(() => { const s = getComputedStyle(document.querySelector(${JSON.stringify(selector)})); return { color: s.color, background: s.backgroundColor } })()`)
}
const away = () => b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 })
const hero = (label) => `#debug-socials .home-hero-socials:not(.debug-social-brand) a[title="${label}"]`

try {
  await b.setViewport(1440, 900)
  await b.goto(`${base}/debug`)
  const idle = await b.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(hero('哔哩哔哩'))})).color`)
  assert.notEqual(idle, 'rgb(0, 161, 214)', '平时是单色')
  assert.equal((await hover(hero('哔哩哔哩'))).color, 'rgb(0, 161, 214)', '悬停哔哩哔哩变成 B 站蓝')
  await away()
  assert.deepEqual(await hover(hero('GitHub')), { color: 'rgb(255, 255, 255)', background: 'rgb(24, 23, 23)' }, '熄灯时 GitHub 悬停是黑色圆底 + 白色图标')
  await away()
  assert.equal((await hover('#debug-socials .nav-socials a[title="小红书"]')).color, 'rgb(255, 36, 66)', '导航面板里悬停同样换成品牌色')
  await away()

  await b.evaluate(`document.documentElement.dataset.theme = 'light'`)
  await sleep(700)
  assert.equal((await hover(hero('GitHub'))).color, 'rgb(24, 23, 23)', '开灯时 GitHub 悬停直接用品牌色')
  assert.deepEqual(b.errors, [], '页面不应当有报错')
  console.log('PASS 社交图标：平时单色、悬停换品牌色（首屏与导航面板），深色品牌熄灯时白色图标')
} finally {
  await b.close()
}
