import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes, createHmac } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync, openSync, closeSync, realpathSync, existsSync } from 'node:fs'
import { connect } from 'node:net'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = fileURLToPath(new URL('../', import.meta.url))
const local = join(root, '.local/verification')
const api = 'http://127.0.0.1:2533'
const web = 'http://127.0.0.1:2523'
const origin = 'http://127.0.0.1:9529'
const ports = [27029, 6391, 2533, 2523]
const isOpen = port => new Promise(resolve => {
  const socket = connect({ host: '127.0.0.1', port })
  const done = value => { socket.destroy(); resolve(value) }
  socket.once('connect', () => done(true)); socket.once('error', () => done(false)); socket.setTimeout(500, () => done(false))
})
for (const port of [...ports, 27018, 6380, 2333, 2323]) assert.equal(await isOpen(port), false, `Port ${port} must be stopped before isolated test`)
mkdirSync(local, { recursive: true, mode: 0o700 })
const secret = randomBytes(32).toString('hex')
const log = openSync(join(local, 'webhook-run.log'), 'a', 0o600)
const child = spawn(process.execPath, ['scripts/dev.mjs', '--test'], { cwd: root, detached: true, stdio: ['ignore', log, log], env: { ...process.env, SIN_VERIFY: '1', SIN_CORE_NO_WATCH: '1', SIN_RESOURCE_ROOT_PID: String(process.pid), MIX_SPACE_WEBHOOK_SECRET: secret } })
closeSync(log)
let exited = false
const exit = new Promise(resolve => child.once('exit', code => { exited = true; resolve(code) }))
let cookie = '', hookId, postId, mongo
const report = { passed: false, cleaned: false, checks: [] }
const run = randomBytes(5).toString('hex')
const deadline = setTimeout(() => child.kill('SIGINT'), 180000)
async function request(method, path, body) {
  const response = await fetch(api + path, { method, headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000), redirect: 'error' })
  assert.ok(response.ok, `${method} ${path}: HTTP ${response.status}`)
  const text = await response.text()
  return text ? JSON.parse(text) : null
}
async function html(path) { const response = await fetch(web + path, { signal: AbortSignal.timeout(30000), redirect: 'error' }); return response.text() }
async function waitFor(check, message) {
  for (let i = 0; i < 60; i++) { if (exited) throw new Error('Isolated stack exited'); const value = await check(); if (value) return value; await delay(250) }
  throw new Error(message)
}
async function dispatch(event, previous = 0) {
  return waitFor(async () => {
    const response = await request('GET', `/webhooks/${hookId}?page=1&size=30`)
    const entries = response.data.filter(entry => entry.event === event && entry.success && entry.status === 200)
    return entries.length > previous ? entries[0] : false
  }, `No successful ${event} delivery`)
}
try {
  await waitFor(() => isOpen(2533), 'Core did not start')
  const require = createRequire(join(root, 'apps/core/package.json'))
  const { MongoClient } = require('mongodb')
  mongo = new MongoClient('mongodb://127.0.0.1:27029'); await mongo.connect()
  const opts = await mongo.db('admin').command({ getCmdLineOpts: 1 })
  assert.equal(realpathSync(opts.parsed.storage.dbPath), realpathSync(join(local, 'mongo')))
  const accountFile = join(local, 'webhook-account.json')
  let account
  if (!existsSync(accountFile)) {
    const init = await request('GET', '/init')
    assert.ok(!init.is_init && !init.isInit)
    account = { username: 'webhook-test', password: randomBytes(24).toString('hex'), mail: 'webhook-test@example.invalid' }
    await request('POST', '/init/owner', account)
    writeFileSync(accountFile, JSON.stringify(account), { mode: 0o600 })
  } else account = JSON.parse(readFileSync(accountFile, 'utf8'))
  assert.equal(account.username, 'webhook-test')
  const login = await fetch(api + '/auth/sign-in/username', { method: 'POST', headers: { 'content-type': 'application/json', Origin: origin }, body: JSON.stringify({ username: account.username, password: account.password }), signal: AbortSignal.timeout(15000), redirect: 'error' })
  assert.equal(login.status, 200)
  cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; '); assert.ok(cookie)
  const categories = await request('GET', '/categories?type=0')
  let category = categories.data.find(item => item.slug === 'webhook-verification')
  if (!category) category = await request('POST', '/categories', { name: 'Webhook测试', slug: 'webhook-verification', type: 0 })
  const categoryId = category.id ?? category.data?.id
  assert.ok(categoryId)
  await waitFor(() => isOpen(2523), 'Next did not start')
  const previousHooks = await request('GET', '/webhooks')
  for (const hook of previousHooks.data) {
    const target = hook.payload_url ?? hook.payloadUrl
    if (typeof target === 'string' && target.startsWith(`${web}/api/webhooks/mix-space?verification=`) && /^[a-f0-9]{10}$/.test(target.split('verification=')[1])) await request('DELETE', `/webhooks/${hook.id}`)
  }
  const payloadUrl = `${web}/api/webhooks/mix-space?verification=${run}`
  await request('POST', '/webhooks', { payloadUrl, events: ['POST_CREATE', 'POST_UPDATE', 'POST_DELETE'], enabled: true, secret, scope: 5 })
  const hooks = await request('GET', '/webhooks');hookId = hooks.data.find(item => item.payload_url === payloadUrl || item.payloadUrl === payloadUrl)?.id;assert.ok(hookId)
  await dispatch('health_check');report.checks.push('Core health_check signed and accepted')
  const slug = `webhook-${run}`, title1 = `Webhook ${run} v1`, title2 = `Webhook ${run} v2`
  const before = await html('/posts');assert.ok(!before.includes(title1))
  const post = await request('POST', '/posts', { title: title1, slug, text: 'verification body one', categoryId, isPublished: true, allowComment: false, contentFormat: 'markdown' });postId = post.id ?? post.data?.id;assert.ok(postId)
  await dispatch('POST_CREATE');assert.ok((await html('/posts')).includes(title1));report.checks.push('real publish invalidates primed list cache')
  const detailPath = `/posts/webhook-verification/${slug}`
  assert.ok((await html(detailPath)).includes('verification body one'))
  await request('PATCH', `/posts/${postId}`, { title: title2, text: 'verification body two' })
  await dispatch('POST_UPDATE');assert.ok((await html('/posts')).includes(title2));assert.ok((await html(detailPath)).includes('verification body two'));report.checks.push('real update invalidates list and detail')
  const invalid = await fetch(web + '/api/webhooks/mix-space', { method: 'POST', headers: { 'content-type': 'application/json', 'x-webhook-event': 'POST_UPDATE', 'x-webhook-signature256': createHmac('sha256', 'wrong').update(JSON.stringify({ id: postId })).digest('hex') }, body: JSON.stringify({ id: postId }) });assert.equal(invalid.status, 401);report.checks.push('bad signature rejected')
  await request('DELETE', `/posts/${postId}`);postId = null
  await dispatch('POST_DELETE');assert.ok(!(await html('/posts')).includes(title2));const removed = await html(detailPath);assert.ok(!removed.includes('verification body two'));assert.ok(removed.includes('NEXT_HTTP_ERROR_FALLBACK') || removed.includes('404'));report.checks.push('real delete invalidates list and cached detail')
  await request('PATCH', `/webhooks/${hookId}`, {});await dispatch('health_check', 1);report.checks.push('admin health-check API binding')
  const delivered = await dispatch('POST_DELETE');await request('POST', `/webhooks/redispatch/${delivered.id}`);await dispatch('POST_DELETE', 1);report.checks.push('actual redispatch accepted')
  report.passed = true
} catch (error) { report.failure = error.message; process.exitCode = 1 }
finally {
  clearTimeout(deadline)
  if (!exited && cookie) {
    if (postId) await request('DELETE', `/posts/${postId}`).catch(() => {})
    if (hookId) await request('DELETE', `/webhooks/${hookId}`).catch(() => {})
  }
  await mongo?.close()
  child.kill('SIGINT')
  await Promise.race([exit, delay(15000)])
  if (!exited) { try { process.kill(-child.pid, 'SIGKILL') } catch {} }
  for (let i = 0; i < 40 && (await Promise.all(ports.map(isOpen))).some(Boolean); i++) await delay(250)
  report.cleaned = !(await Promise.all(ports.map(isOpen))).some(Boolean)
  writeFileSync(join(local, `webhook-result-${Date.now()}.json`), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
}
