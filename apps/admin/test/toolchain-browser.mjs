import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const [baseUrl, cookieFile, outputDirectory] = process.argv.slice(2)
const development = process.argv.includes('--development')
assert(baseUrl && cookieFile && outputDirectory,
  'Usage: node test/toolchain-browser.mjs <local-admin-url> <cookie-file> <output-directory>')
const base = new URL(baseUrl)
assert.equal(base.hostname, '127.0.0.1', 'Only a local isolated Admin is allowed')
const output = resolve(outputDirectory)
await mkdir(output, { recursive: true })
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true })
const evidence = { checks: [], workers: [], errors: [], failedResponses: [], blockedWrites: [] }
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.grantPermissions(['notifications'], { origin: base.origin })
  await context.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
        !url.pathname.startsWith('/socket.io/')) {
      evidence.blockedWrites.push({ method: request.method(), path: url.pathname })
      return route.abort()
    }
    await route.continue()
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => evidence.errors.push(error.message))
  page.on('worker', (worker) => evidence.workers.push(new URL(worker.url()).pathname))
  page.on('response', (response) => {
    if (response.status() >= 400) evidence.failedResponses.push({
      status: response.status(), path: new URL(response.url()).pathname,
    })
  })
  await page.goto(`${baseUrl}#/login`)
  await page.locator('input[type=password]').waitFor()
  assert(await page.locator('input[type=password]').isVisible())
  await page.screenshot({ path: resolve(output, 'login.png') })
  evidence.checks.push('Vue login form renders from the served artifact')

  const cookie = (await readFile(cookieFile, 'utf8')).trim().split(';')[0]
  const separator = cookie.indexOf('=')
  assert(separator > 0, 'A cookie name and value are required')
  await context.addCookies([{
    name: cookie.slice(0, separator), value: cookie.slice(separator + 1),
    domain: base.hostname, path: '/', httpOnly: true, sameSite: 'Lax',
  }])
  await page.goto(`${baseUrl}#/debug/rich`)
  const editor = page.locator('[contenteditable=true]').first()
  await editor.waitFor()
  await editor.click()
  await page.keyboard.type('A1 native editor')
  assert.equal(await editor.innerText(), 'A1 native editor')
  assert(await editor.evaluate((element) => {
    const selection = window.getSelection()
    return selection?.isCollapsed && element.contains(selection.anchorNode)
  }))
  await page.keyboard.type(' follow-up')
  assert.equal(await editor.innerText(), 'A1 native editor follow-up')
  await page.getByRole('button', { name: '切换主题', exact: true }).click()
  await page.getByText('Dark', { exact: true }).click()
  await page.waitForFunction(() => localStorage.getItem('theme-mode') === 'dark')
  assert.equal(await editor.innerText(), 'A1 native editor follow-up')
  evidence.checks.push('React editor mounts in Vue, keeps DOM selection, accepts native typing and survives theme update')

  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/whiteboard')
  await page.getByText('Excalidraw whiteboard canvas', { exact: true }).click()
  await page.getByText('Edit Whiteboard', { exact: true }).click()
  await page.locator('.excalidraw .App-menu_top').waitFor()
  await page.locator('.excalidraw label[title^=Rectangle]').click()
  await page.mouse.move(500, 350)
  await page.mouse.down()
  await page.mouse.move(800, 550, { steps: 12 })
  await page.mouse.up()
  await page.screenshot({ path: resolve(output, 'whiteboard.png') })
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Discard', exact: true }).click()
  await page.waitForFunction(() => document.querySelectorAll('[role=dialog]').length === 0)
  evidence.checks.push('Excalidraw loads, accepts drawing and closes the unsaved-changes dialog without a persistence request')

  await page.getByRole('button', { name: 'Image', exact: true }).click()
  await page.getByText('Click to upload or drag and drop', { exact: true }).waitFor()
  assert(await page.locator('input[type=file]').count() > 0)
  await page.screenshot({ path: resolve(output, 'image-dialog.png') })
  evidence.checks.push('Image upload dialog and native file input mount')

  await page.goto(`${baseUrl}#/debug/events`)
  await page.locator('.monaco-editor').waitFor()
  await page.locator('.monaco-editor').click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.type('const a1 = 42;')
  await page.locator('.monaco-editor .view-line').filter({ hasText: 'const a1 = 42;' }).waitFor()
  const editorWorkerReady = page.waitForEvent('worker', { predicate: (worker) => worker.url().includes('editor.worker') })
  await page.evaluate(() => { self.MonacoEnvironment.getWorker('', 'editorWorkerService') })
  const editorWorker = await editorWorkerReady
  assert.equal(await editorWorker.evaluate(() => typeof self.onmessage), 'function')
  await editorWorker.evaluate(() => self.close())
  assert(evidence.workers.some((path) => path.includes('ts.worker')))
  assert(evidence.workers.some((path) => path.includes('editor.worker')))
  assert(evidence.workers.every((path) => development
    ? path.startsWith('/node_modules/.pnpm/monaco-editor@')
    : path.startsWith(base.pathname)))
  await page.screenshot({ path: resolve(output, 'monaco.png') })
  evidence.checks.push(development
    ? 'Monaco accepts native typing and loads both Vite development workers'
    : 'Monaco accepts native typing and loads TypeScript and editor workers under the configured base')
  await page.goto(`${baseUrl}#/debug/rich`)
  await page.locator('[contenteditable=true]').first().waitFor()
  evidence.checks.push('React editor remounts after leaving the route')
  assert.deepEqual(evidence.blockedWrites, [])
  assert.deepEqual(evidence.errors, [])
  assert.deepEqual(evidence.failedResponses.filter(({ status, path }) =>
    !(status === 404 && path === '/init')), [], 'Only the pre-existing initialized-system /init 404 is allowed')
  console.log(`PASS ${evidence.checks.length} Admin browser checks`)
} finally {
  await writeFile(resolve(output, 'results.json'), `${JSON.stringify(evidence, null, 2)}\n`)
  await browser.close()
}
