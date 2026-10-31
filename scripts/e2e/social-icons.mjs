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

  // 名片（微信、QQ）：在竖线后面；点 QQ 弹出卡片（二维码 + 号码 + 复制），点外面关闭；导航面板只有直达链接
  const cards = await b.evaluate(`(() => {
    const items = [...document.querySelectorAll('#debug-social-cards .home-hero-socials > li')]
    return items.map((li) => li.classList.contains('home-hero-socials-divider') ? '|' : li.querySelector('a, button').getAttribute('title'))
  })()`)
  assert.deepEqual(cards, ['GitHub', '哔哩哔哩', '微博', '|', '微信', 'QQ'], '直达链接在前，竖线，名片在后')
  await b.evaluate(`document.querySelector('#debug-social-cards button[title="QQ"]').scrollIntoView({ block: 'center' })`)
  await b.evaluate(`document.querySelector('#debug-social-cards button[title="QQ"]').click()`)
  await sleep(500)
  const card = await b.evaluate(`(() => { const c = document.querySelector('.contact-card'); return c && { title: c.querySelector('.contact-card-title').textContent, qr: !!c.querySelector('img.contact-card-qr'), id: c.querySelector('.contact-card-id span')?.textContent, copy: c.querySelector('.contact-card-id button')?.textContent } })()`)
  assert.deepEqual(card, { title: 'QQ', qr: true, id: '10001', copy: '复制' }, '点 QQ 弹出名片')
  await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 5, y: 5, button: 'left', buttons: 1, clickCount: 1 })
  await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 5, y: 5, button: 'left', buttons: 0, clickCount: 1 })
  await sleep(500)
  assert.equal(await b.evaluate(`document.querySelector('.contact-card')`), null, '点外面关闭')

  await b.evaluate(`document.documentElement.dataset.theme = 'light'`)
  await sleep(700)
  assert.equal((await hover(hero('GitHub'))).color, 'rgb(24, 23, 23)', '开灯时 GitHub 悬停直接用品牌色')

  // 真实导航的“首页”面板：社交图标悬停同样换成品牌色；只显示能直接跳转的，没有微信、QQ（用站长后台里的真实社交链接）
  await b.goto(`${base}/notes`)
  const trigger = await b.evaluate(`(() => { const t = [...document.querySelectorAll('.navigation-List .navigation-Trigger')].find((el) => el.textContent.trim().startsWith('首页')); const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: trigger.x, y: trigger.y + 80 })
  await sleep(600)
  await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: trigger.x, y: trigger.y })
  await sleep(900)
  const navTitles = await b.evaluate(`[...document.querySelectorAll('.navigation-Popup .nav-socials a')].map((a) => a.title)`)
  assert.ok(navTitles.length > 0, '导航面板里有社交图标')
  assert.equal(navTitles.some((title) => ['微信', 'QQ'].includes(title)), false, `导航面板只显示能直接跳转的：${navTitles}`)
  const navIcon = `.navigation-Popup .nav-socials a[title="${navTitles[0]}"]`
  const navBox = await b.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(navIcon)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  const navIdle = await b.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(navIcon)})).color`)
  await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: navBox.x, y: navBox.y })
  await sleep(450)
  const navHover = await b.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(navIcon)})).color`)
  assert.notEqual(navHover, navIdle, '导航面板里悬停换成品牌色')
  assert.deepEqual(b.errors, [], '页面不应当有报错')
  console.log('PASS 社交图标：平时单色、悬停换品牌色（首屏与导航面板），深色品牌熄灯时白色图标；微信、QQ 名片在竖线后、点开看二维码和号码')
} finally {
  await b.close()
}
