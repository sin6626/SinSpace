import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const launcher = fileURLToPath(new URL('./dev.mjs', import.meta.url))
const directory = mkdtempSync(join(tmpdir(), 'sin-dev-config-'))
const databaseFile = join(directory, 'database')
writeFileSync(databaseFile, 'shrio-import-20261014')
const config = (args = [], env = {}) => JSON.parse(execFileSync(process.execPath, [launcher, '--print-config', ...args], {
  env: { ...process.env, MIX_SPACE_DATA_ROOT: directory, ...env }, encoding: 'utf8', stdio: 'pipe',
}))
try {
  const normal = config([], { SIN_VERIFY: '1', SIN_MAX_RSS_MIB: '1' })
  assert.equal(normal.dataRoot, directory)
  assert.equal(normal.database, 'shrio-import-20261014')
  assert.equal(normal.resourceBudget, null)
  assert.equal(normal.coreEnv.MX_DATA_DIR, join(directory, '../apps/mix-space/apps/core/tmp'))
  assert.deepEqual(normal.ports, { mongo: 27018, redis: 6380, core: 2333, web: 2323 })
  assert.equal('JWT_SECRET' in normal.coreEnv, false)
  const test = config(['--test'], { SIN_VERIFY: '1', SIN_MAX_RSS_MIB: '2560' })
  assert.equal(test.database, 'sinpersonalspace-verify')
  assert.notEqual(test.dataRoot, directory)
  assert.equal(test.resourceBudget.maxRssMiB, 2560)
  assert.equal(config(['--web-only'], { MIX_SPACE_DATA_ROOT: '/does-not-exist' }).database, null)
  assert.throws(() => config(['--core-only', '--web-only']), /不能同时/)
  assert.equal(readFileSync(databaseFile, 'utf8'), 'shrio-import-20261014')
  console.log('PASS shared paths, local ports, no secret output, isolated verification budget and web-only independence')
} finally {
  unlinkSync(databaseFile)
  rmdirSync(directory)
}
