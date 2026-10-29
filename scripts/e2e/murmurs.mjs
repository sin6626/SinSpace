// 前台碎碎念：/debug 的示例流按天分段（跨年写年份）、同一天连成一串气泡、图片按标题里的宽度占气泡的百分比；
// 导航“碎碎念”指向 /murmurs，思考挪进“更多”（/thinking 标题改为“思考”）；首页右栏的“全部”指向 /murmurs。
// 需先开 pnpm dev。用法：node scripts/e2e/murmurs.mjs（WEB_URL 可改地址）
import assert from 'node:assert/strict'
import { openBrowser } from '../headless-browser.mjs'

const base = process.env.WEB_URL ?? 'http://127.0.0.1:2323'
const b = await openBrowser({ port: 9345 })
try {
  await b.setViewport(1920, 991)

  await b.goto(`${base}/debug`)
  const sample = await b.evaluate(`(() => {
    const stream = document.querySelector('#debug-murmurs .murmur-stream')
    const days = [...stream.querySelectorAll('.murmur-day')].map((day) => ({
      date: day.querySelector('.murmur-date').textContent,
      bubbles: day.querySelectorAll('.murmur-bubble').length,
    }))
    const ratios = [...stream.querySelectorAll('.murmur-image')].map((img) => Math.round((img.offsetWidth / img.closest('.murmur-body').offsetWidth) * 100))
    const first = stream.querySelector('.murmur-bubble')
    return { days, ratios, time: first.querySelector('time').textContent, code: !!stream.querySelector('.murmur-body code'), link: stream.querySelector('.murmur-body a')?.target }
  })()`)
  assert.deepEqual(sample.days, [
    { date: '202610月29日周四', bubbles: 3 },
    { date: '10月27日周二', bubbles: 1 },
    { date: '202512月31日周三', bubbles: 1 },
  ], '按东八区日期分段，第一段和跨年的那段写年份')
  assert.deepEqual(sample.ratios, [40, 100], '图片宽度按标题里的 w=40%，没写的是 100%')
  assert.equal(sample.time, '22:20', '时间按东八区显示')
  assert.equal(sample.code, true, '行内代码照常渲染')
  assert.equal(sample.link, '_blank', '外链新窗口打开')

  await b.goto(`${base}/murmurs`)
  const page = await b.evaluate(`({
    h1: [...document.querySelectorAll('h1')].find((el) => el.offsetParent)?.textContent,
    bubbles: document.querySelectorAll('.murmur-bubble').length,
    nav: [...document.querySelectorAll('.navigation-List > li > a')].map((a) => a.getAttribute('href')),
    current: document.querySelector('.navigation-List a[href="/murmurs"]')?.getAttribute('aria-current') === 'page',
  })`)
  assert.equal(page.h1, '碎碎念')
  assert.ok(page.bubbles > 0, '碎碎念页应当有内容')
  assert.ok(page.nav.includes('/murmurs') && !page.nav.includes('/thinking'), `一级导航应当是 /murmurs，思考不在一级：${page.nav}`)
  assert.equal(page.current, true, '在碎碎念页时导航的“碎碎念”是当前项')

  await b.goto(`${base}/thinking`)
  assert.equal(await b.evaluate(`[...document.querySelectorAll('h1')].find((el) => el.offsetParent)?.textContent`), '思考')

  await b.goto(`${base}/`)
  assert.equal(await b.evaluate(`document.querySelector('.home-side-murmurs a[href="/murmurs"]') !== null`), true, '首页碎碎念的“全部”指向 /murmurs')

  assert.deepEqual(b.errors, [], '页面不应当有报错')
  console.log('PASS 碎碎念：按天分段、图片宽度百分比、导航与思考改名、首页入口')
} finally {
  b.close()
}
