// 后台“碎碎念”：菜单在“说说”和“思考”之间；列表按天分组、分页加载；⌘V 粘贴图片 → 拖角缩放（吸附、方向键微调）→ ⌘↵ 提交，
// 提交的正文是“文字 + 图片 Markdown（宽度写在标题里）”。用后台本地 API 令牌（.local/publish.json）代替登录；
// 上传和新建请求都在浏览器里拦截替换，不写日常库、不往图床传图。需先开 pnpm dev（后台 9528、Core 2333）。
// 用法：node scripts/e2e/admin-murmurs.mjs（ADMIN_URL 可改后台地址）
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { openBrowser, sleep } from '../headless-browser.mjs'

const admin = process.env.ADMIN_URL ?? 'http://127.0.0.1:9528'
const core = 'http://127.0.0.1:2333'
const token = JSON.parse(readFileSync(new URL('../../.local/publish.json', import.meta.url), 'utf8')).local.token
const fakeImage = `${core}/objects/avatar/Sin.jpg`
const cors = [
  { name: 'Access-Control-Allow-Origin', value: new URL(admin).origin },
  { name: 'Access-Control-Allow-Credentials', value: 'true' },
  { name: 'Content-Type', value: 'application/json' },
]

const b = await openBrowser({ port: 9342 })
const posted = []
const leaked = []
try {
  await b.setViewport(1440, 900)
  await b.send('Fetch.enable', { patterns: [{ urlPattern: `${core}/*` }] })
  b.listeners.push((m) => {
    if (m.method !== 'Fetch.requestPaused') return
    const { requestId, request } = m.params
    const fulfill = (body) => b.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: cors, body: Buffer.from(JSON.stringify(body)).toString('base64') })
    if (request.method === 'POST' && request.url.includes('/files/upload')) return fulfill({ url: fakeImage, name: 'e2e.jpg' })
    if (request.method === 'POST' && request.url.endsWith('/murmurs')) {
      const { content } = JSON.parse(request.postData)
      posted.push(content)
      return fulfill({ id: '000000000000000000000e2e', content, created: new Date().toISOString() })
    }
    if (!['GET', 'OPTIONS', 'HEAD'].includes(request.method)) leaked.push(`${request.method} ${request.url}`)
    const headers = [...Object.entries(request.headers).map(([name, value]) => ({ name, value })), { name: 'x-api-key', value: token }]
    b.send('Fetch.continueRequest', { requestId, headers })
  })

  await b.goto(`${admin}/#/murmurs`, 5000)
  assert.equal(await b.evaluate('location.hash'), '#/murmurs', '用 API 令牌应当能直接打开后台，不被跳到登录页')

  // 菜单顺序：说说 → 碎碎念 → 思考（速记已改名思考）
  const order = await b.evaluate(`(() => {
    const first = (label) => [...document.querySelectorAll('body *')].find((el) => el.children.length === 0 && el.textContent.trim() === label)
    const [say, murmur, think] = ['说说', '碎碎念', '思考'].map(first)
    const before = (a, z) => Boolean(a && z && a.compareDocumentPosition(z) & Node.DOCUMENT_POSITION_FOLLOWING)
    return { hasShorthand: [...document.querySelectorAll('body *')].some((el) => el.children.length === 0 && el.textContent.trim() === '速记'), ok: before(say, murmur) && before(murmur, think) }
  })()`)
  assert.deepEqual(order, { hasShorthand: false, ok: true }, '侧栏应为 说说 → 碎碎念 → 思考，且不再出现“速记”')

  // 列表：每页 20 条，按天分组，点“再往前翻翻”加载其余
  const firstPage = await b.evaluate(`({ entries: document.querySelectorAll('[role=feed] article').length, days: document.querySelectorAll('[role=feed] section header').length, more: [...document.querySelectorAll('button')].some((el) => el.textContent.includes('再往前翻翻')) })`)
  assert.ok(firstPage.entries > 0 && firstPage.entries <= 20, `第一页应当最多 20 条，实际 ${firstPage.entries}`)
  assert.ok(firstPage.days >= 1)
  if (firstPage.more) {
    await b.evaluate(`[...document.querySelectorAll('button')].find((el) => el.textContent.includes('再往前翻翻')).click()`)
    await sleep(1500)
    const after = await b.evaluate(`document.querySelectorAll('[role=feed] article').length`)
    assert.ok(after > firstPage.entries, '加载更多后条数应当增加')
  }

  // ⌘V 粘贴一张图：先显示本地预览和“上传中”，传完后出现在图片区，默认 100%
  await b.evaluate(`(async () => {
    const canvas = Object.assign(document.createElement('canvas'), { width: 400, height: 300 })
    canvas.getContext('2d').fillRect(0, 0, 400, 300)
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
    const data = new DataTransfer()
    data.items.add(new File([blob], 'paste.png', { type: 'image/png' }))
    const textarea = document.querySelector('textarea')
    textarea.focus()
    textarea.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
  })()`)
  let stage
  for (let i = 0; i < 40; i++) {
    stage = await b.evaluate(`(() => {
      const frame = document.querySelector('[role=list][aria-label=图片] [tabindex="0"]')
      if (!frame) return null
      return { uploading: frame.textContent.includes('上传中'), ratio: frame.offsetWidth / frame.parentElement.offsetWidth }
    })()`)
    if (stage && !stage.uploading) break
    await sleep(100)
  }
  assert.ok(stage && !stage.uploading, '粘贴后图片应当上传完成并出现在图片区')
  assert.ok(Math.abs(stage.ratio - 1) < 0.01, '新贴的图默认占满宽度')

  // 拖右下角往左 40%：缩到 60%（不在吸附点附近，原样保留）
  const handle = await b.evaluate(`(() => {
    const frame = document.querySelector('[role=list][aria-label=图片] [tabindex="0"]')
    const rect = frame.querySelector('[data-corner=se]').getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, row: frame.parentElement.offsetWidth }
  })()`)
  const mouse = (type, x, y) => b.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 })
  await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: handle.x - 20, y: handle.y - 20 })
  await mouse('mousePressed', handle.x, handle.y)
  for (let step = 1; step <= 8; step++) await mouse('mouseMoved', handle.x - (handle.row * 0.4 * step) / 8, handle.y)
  const badgeWhileDragging = await b.evaluate(`document.querySelector('[role=list][aria-label=图片] [data-dragging] span[aria-hidden]')?.textContent`)
  await mouse('mouseReleased', handle.x - handle.row * 0.4, handle.y)
  assert.equal(badgeWhileDragging, '60%', '拖动时角标显示当前宽度')

  // 拖到 49% 附近会吸附到 50%
  const handle2 = await b.evaluate(`(() => { const r = document.querySelector('[data-corner=se]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  await mouse('mousePressed', handle2.x, handle2.y)
  await mouse('mouseMoved', handle2.x - handle.row * 0.11, handle2.y)
  await mouse('mouseReleased', handle2.x - handle.row * 0.11, handle2.y)
  assert.match(await b.evaluate(`document.querySelector('[role=list][aria-label=图片] [tabindex="0"]').getAttribute('aria-label')`), /宽度 50%/, '49% 附近吸附到 50%')

  // 聚焦图片后方向键每次 5%
  await b.evaluate(`document.querySelector('[role=list][aria-label=图片] [tabindex="0"]').focus()`)
  for (const type of ['keyDown', 'keyUp']) await b.send('Input.dispatchKeyEvent', { type, key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 })
  assert.match(await b.evaluate(`document.querySelector('[role=list][aria-label=图片] [tabindex="0"]').getAttribute('aria-label')`), /宽度 45%/)

  // 写字，⌘↵ 提交：正文是文字 + 带宽度的图片 Markdown，地址就是图床返回的地址
  await b.evaluate(`document.querySelector('textarea').focus()`)
  await b.send('Input.insertText', { text: 'e2e 测试一句' })
  for (const type of ['keyDown', 'keyUp']) await b.send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, modifiers: 4 })
  await sleep(800)
  assert.deepEqual(posted, [`e2e 测试一句\n\n![](${fakeImage} "w=45%")`])
  const top = await b.evaluate(`(() => { const a = document.querySelector('[role=feed] article'); return { text: a.querySelector('p')?.textContent, width: a.querySelector('img')?.style.width } })()`)
  assert.deepEqual(top, { text: 'e2e 测试一句', width: '45%' }, '提交后新的一条出现在最上面，图片按 45% 显示')
  assert.equal(await b.evaluate(`document.querySelector('textarea').value`), '', '提交后输入框清空')
  assert.equal(await b.evaluate(`document.querySelector('[role=list][aria-label=图片]')`), null, '提交后图片区清空')

  assert.deepEqual(leaked, [], '测试不应当有真正写入 Core 的请求')
  assert.deepEqual(b.errors, [], '页面不应当有报错')
  console.log('PASS 后台碎碎念：菜单顺序、分页、粘贴上传、拖角缩放（吸附/方向键）、⌘↵ 提交的 Markdown')
} finally {
  b.close()
}
