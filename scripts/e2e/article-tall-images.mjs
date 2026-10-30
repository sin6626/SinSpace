// 文章里的高图限高：人物全身照这类竖图不再占满整栏宽、几屏高，而是等比缩到最高 min(70vh, 42rem) 并居中；
// 宽图、比栏窄的小图保持原样。富文本（Haklex）和 Markdown 文章各测一篇：把页面里一张真实图片换成 600×1500 的竖图再量。
// 需先开 pnpm dev。用法：node scripts/e2e/article-tall-images.mjs（WEB_URL 可改地址）
import assert from 'node:assert/strict'
import { openBrowser } from '../headless-browser.mjs'

const base = process.env.WEB_URL ?? 'http://127.0.0.1:2323'
const viewport = { width: 1920, height: 991 }
const cap = Math.min(viewport.height * 0.7, 42 * 16)
const b = await openBrowser({ port: 9349 })

// 把第 index 张图换成 600×1500 的竖图（富文本还要改外框的比例，和 Haklex 渲染真图时一样）
const makeTall = (selector, index, rich) => `(async () => {
  const img = [...document.querySelectorAll('${selector}')].filter((el) => el.offsetParent)[${index}]
  const canvas = Object.assign(document.createElement('canvas'), { width: 600, height: 1500 })
  canvas.getContext('2d').fillRect(0, 0, 600, 1500)
  img.removeAttribute('srcset')
  img.src = canvas.toDataURL()
  await img.decode()
  if (${rich}) img.closest('.rr-image-frame').style.aspectRatio = '600 / 1500'
  await new Promise((r) => requestAnimationFrame(r))
})()`
const measure = (selector) => `[...document.querySelectorAll('${selector}')].filter((el) => el.offsetParent).map((el) => {
  const box = el.getBoundingClientRect(), column = el.closest('figure, p').getBoundingClientRect()
  return { width: Math.round(box.width), height: Math.round(box.height), center: Math.round(box.left + box.width / 2 - (column.left + column.width / 2)) }
})`

try {
  await b.setViewport(viewport.width, viewport.height)

  // 富文本：Plate 对比文章有 4 张图（864×142、1263×546 宽图，765×235、770×267 比栏窄的小图）
  await b.goto(`${base}/posts/study%26think/plate-v1-vs-v2-comparison`, 5000)
  const frames = '.article-rich .rr-image-frame'
  const before = await b.evaluate(measure(frames))
  await b.evaluate(makeTall('.article-rich .rr-image-img', 1, true))
  const after = await b.evaluate(measure(frames))
  const tall = after[1]
  assert.ok(tall.height <= cap + 1, `富文本竖图应当不高于 ${cap}px，实际 ${tall.height}`)
  assert.ok(Math.abs(tall.width / tall.height - 0.4) < 0.01, `富文本竖图等比缩小，实际 ${tall.width}×${tall.height}`)
  assert.ok(Math.abs(tall.center) <= 1, '富文本竖图居中')
  assert.deepEqual([after[0], after[2], after[3]], [before[0], before[2], before[3]], '其他图片保持原样')
  assert.deepEqual(before.map((box) => box.width), [848, 848, 765, 770], '宽图占满栏宽、小图保持原宽')

  // Markdown：Tailwind/Nest 总结那篇有 1 张图
  await b.goto(`${base}/posts/study%26think/tailwind-nest-summary`, 4000)
  const images = '.article-body img'
  await b.evaluate(makeTall(images, 0, false))
  const [markdown] = await b.evaluate(measure(images))
  assert.ok(markdown.height <= cap + 1, `Markdown 竖图应当不高于 ${cap}px，实际 ${markdown.height}`)
  assert.ok(Math.abs(markdown.width / markdown.height - 0.4) < 0.01, `Markdown 竖图等比缩小，实际 ${markdown.width}×${markdown.height}`)
  assert.ok(Math.abs(markdown.center) <= 1, 'Markdown 竖图居中')

  assert.deepEqual(b.errors, [], '页面不应当有报错')
  console.log(`PASS 文章高图限高：富文本 ${tall.width}×${tall.height}、Markdown ${markdown.width}×${markdown.height}（上限 ${Math.round(cap)}px），其他图片不变`)
} finally {
  b.close()
}
