import assert from 'node:assert/strict'
import { readFileSync, realpathSync } from 'node:fs'
import { join } from 'node:path'

// 前端用到的 Haklex 包必须解析到工作区补丁版本（pnpm-workspace.yaml 的 patchedDependencies）。
// 升级或重装依赖后补丁失效时这里会失败，而不是等到浏览器里才出现水合错误或开发期警告。
const web = new URL('../apps/web/node_modules/', import.meta.url).pathname
const kit = realpathSync(join(web, '@haklex/rich-kit-shiro'))
const resolve = (name) => realpathSync(join(kit, '..', name))

const staticRenderer = resolve('rich-static-renderer')
assert.match(staticRenderer, /patch_hash=/, 'rich-static-renderer 未应用补丁（表格 tbody、标题唯一 slug 等）')

const excalidraw = resolve('rich-ext-excalidraw')
assert.match(excalidraw, /patch_hash=/, 'rich-ext-excalidraw 未应用补丁')
const node = readFileSync(join(excalidraw, 'dist/ExcalidrawNode-DEcONli3.js'), 'utf8')
const editor = readFileSync(join(excalidraw, 'dist/index.mjs'), 'utf8')
// 严格模式会构造两次 Excalidraw，被丢弃的实例延时调用 scrollToContent 会触发 “setState on a component that is not yet mounted”。
assert.equal((node.match(/apiRef\.current === api\) api\.scrollToContent\(\)/g) ?? []).length, 2)
assert.equal((editor.match(/previewApiRef\.current === api\) api\.scrollToContent\(\)/g) ?? []).length, 1)
assert.equal(/setTimeout\(\(\) => api\.scrollToContent\(\), 100\)/.test(node + editor), false, '仍有未加保护的 scrollToContent')
console.log('PASS haklex packages resolve to workspace patches, excalidraw scrollToContent only targets the mounted instance')
