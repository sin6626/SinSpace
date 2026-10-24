import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

// 2026-10-24 03:00：MX_DATA_DIR 让 TEMP_DIR 与 DATA_DIR 指向同一目录，cleanTempDirectory 删掉了全部上传文件。
// 这里确认配置 MX_DATA_DIR 时临时目录是独立子目录、不包含数据目录，并且清理任务带有重合保护。
const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const ts = require('typescript')
const read = (file) => readFileSync(new URL(`../apps/core/src/${file}`, import.meta.url), 'utf8')
const code = ts.transpileModule(read('constants/path.constant.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

function load(env, isDev) {
  const module = { exports: {} }
  vm.runInNewContext(code, {
    module, exports: module.exports, process: { env },
    require: (id) => id === '~/global/env.global' ? { cwd: '/repo/apps/core', isDev } : require(id),
  })
  return module.exports
}

const dataDir = '/data/media-root'
for (const isDev of [true, false]) {
  const { TEMP_DIR, DATA_DIR, STATIC_FILE_DIR } = load({ MX_DATA_DIR: dataDir }, isDev)
  assert.equal(DATA_DIR, dataDir)
  assert.notEqual(path.resolve(TEMP_DIR), path.resolve(DATA_DIR))
  assert.equal(path.resolve(DATA_DIR).startsWith(path.resolve(TEMP_DIR) + path.sep), false, '临时目录不能包含数据目录')
  assert.equal(path.resolve(STATIC_FILE_DIR).startsWith(path.resolve(TEMP_DIR) + path.sep), false, '上传文件不能在临时目录里')
}
// 未配置 MX_DATA_DIR 的开发模式（ShrioRenovation 日常 dev）同样不能重合。
{
  const { TEMP_DIR, DATA_DIR } = load({}, true)
  assert.notEqual(path.resolve(TEMP_DIR), path.resolve(DATA_DIR))
  assert.equal(path.resolve(DATA_DIR).startsWith(path.resolve(TEMP_DIR) + path.sep), false)
}
const cron = read('modules/cron-task/cron-business.service.ts')
assert.match(cron, /temp === data \|\| data\.startsWith\(temp \+ sep\)/, 'cleanTempDirectory 需要临时目录与数据目录重合时的保护')
console.log('PASS core TEMP_DIR is separate from DATA_DIR (MX_DATA_DIR and dev default) and cleanTempDirectory refuses to delete the data directory')
