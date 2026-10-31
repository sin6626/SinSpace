// 检查站名 = 站长名字’s Yozora（2026-10-31 站长定）：名字读后台“个人资料”（聚合接口的 user.name），
// 后台 SEO 里的网站标题不再决定站名；没有名字时用兜底的 Sin。不需要服务，用替身代替 Core 加载 apps/web/lib/blog-data.ts。
// 用法：node scripts/verify-site-name.mjs（已并入 pnpm verify）
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const ts = require('typescript')
const source = readFileSync(new URL('../apps/web/lib/blog-data.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

let aggregate
const api = { aggregate: { getAggregateData: async () => aggregate } }
const stubs = {
  'server-only': {},
  './api': { getApiClient: () => api },
  'next/cache': { cacheLife: () => {}, cacheTag: () => {} },
  './excerpt': { excerpt: (value) => value ?? '', readingMinutes: () => 1 },
  './social': { socialLinks: () => [], socialCards: () => [] },
  './theme-config': { parseContentTranslations: () => ({ projects: {} }) },
  './safe-url': { safeUrl: (value) => value },
}
const module = { exports: {} }
vm.runInNewContext(code, { module, exports: module.exports, require: (id) => stubs[id] ?? require(id), URL, console })
const blog = module.exports

const site = (user) => ({ url: { webUrl: 'http://127.0.0.1:2323' }, seo: { title: 'Sin’s Space', description: '一句话' }, commentOptions: {}, user })

aggregate = site({ name: '  Moon  ' })
const renamed = await blog.getSiteSettings()
assert.equal(renamed.name, 'Moon’s Yozora', '站名要用个人资料里的名字，不能用 SEO 里的旧标题')
assert.equal(renamed.ownerName, 'Moon', '首屏问候和页脚落款用的站长名字')

aggregate = site({ name: '' })
assert.equal((await blog.getSiteSettings()).name, 'Sin’s Yozora', '没有名字时用兜底的 Sin')
assert.equal(blog.siteName, 'Sin’s Yozora', '读取失败时的兜底站名')
console.log('verify-site-name: 通过')
