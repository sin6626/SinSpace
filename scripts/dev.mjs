import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { connect, createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { loadEnvFile } from 'node:process'
import { createDevLifecycle } from './dev-lifecycle.mjs'
import { getResourceViolation, sampleResourceUsage, validateResourceBudget } from './resource-budget.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
if (existsSync(join(root, '.env.local'))) loadEnvFile(join(root, '.env.local'))
const testing = process.argv.includes('--test')
const coreOnly = process.argv.includes('--core-only')
const webOnly = process.argv.includes('--web-only')
if (coreOnly && webOnly) throw new Error('--core-only 与 --web-only 不能同时使用。')
const agentVerification = testing && process.env.SIN_VERIFY === '1'
const dataRoot = testing
  ? join(root, '.local/verification')
  : resolve(process.env.MIX_SPACE_DATA_ROOT || join(root, '../ShrioRenovation/.local'))
const mediaRoot = testing
  ? join(dataRoot, 'core')
  : resolve(process.env.MIX_SPACE_MEDIA_ROOT || join(dataRoot, '../apps/mix-space/apps/core/tmp'))
const logs = join(root, testing ? '.local/verification/logs' : '.local/logs')
const ports = testing
  ? { mongo: 27029, redis: 6391, core: 2533, web: 2523 }
  : { mongo: 27018, redis: 6380, core: 2333, web: 2323 }
const host = '127.0.0.1'
const api = `http://${host}:${ports.core}`
const web = `http://${host}:${ports.web}`
const databaseFile = join(dataRoot, 'database')
const database = webOnly ? null : testing ? 'sinpersonalspace-verify'
  : readFileSync(databaseFile, 'utf8').trim()
if (database && !testing && !/^shrio-(?:local|import-\d{8}(?:-[a-z0-9]+)?)$/.test(database)) throw new Error('共享 database 文件中的数据库名称无效。')
const redisDir = database ? join(dataRoot, 'redis', database) : null
const resourceBudget = agentVerification ? validateResourceBudget({
  rootPid: Number(process.env.SIN_RESOURCE_ROOT_PID || process.pid),
  maxRssMiB: Number(process.env.SIN_MAX_RSS_MIB || 2560),
  minFreePercent: Number(process.env.SIN_MIN_FREE_PERCENT || 20),
}) : null
if (resourceBudget && (resourceBudget.maxRssMiB > 2560 || resourceBudget.minFreePercent < 20)) throw new Error('Agent 验证预算只能收紧。')
const coreEnv = {
  NODE_ENV: 'development',
  DB_HOST: host, DB_PORT: String(ports.mongo), REDIS_HOST: host, REDIS_PORT: String(ports.redis),
  MONGO_CONNECTION: '', DB_CONNECTION_STRING: '', REDIS_CONNECTION_STRING: '', DB_USER: '', DB_PASSWORD: '', REDIS_PASSWORD: '', DB_OPTIONS: '',
  COLLECTION_NAME: database, PORT: String(ports.core), HOST: host,
  MX_DISABLE_TELEMETRY: 'true', DISABLE_TELEMETRY: 'true', BETTER_AUTH_URL: api,
  MX_DEV_API_URL: api, MX_DEV_WEB_URL: web, MX_DEV_ADMIN_URL: 'http://127.0.0.1:9528',
  ALLOWED_ORIGINS: `${host}:${ports.web},localhost:${ports.web},${host}:9528`,
  MX_DATA_DIR: mediaRoot, DOTENV_CONFIG_PATH: '/dev/null', DOTENV_CONFIG_OVERRIDE: 'false',
}
if (process.argv.includes('--print-config')) {
  console.log(JSON.stringify({ root, dataRoot, mediaRoot, logs, ports, database, redisDir, coreEnv, coreOnly, webOnly, resourceBudget }))
  process.exit(0)
}
let lifecycle
let mongo
let mongoStart

function fail(error) {
  if (lifecycle) {
    if (!lifecycle.stopping) lifecycle.fail(error)
  } else {
    console.error(error.message)
    process.exitCode = 1
  }
}

function cliPath(directory, packageName, binName) {
  const packageFile = createRequire(join(root, directory, 'package.json')).resolve(`${packageName}/package.json`)
  const { bin } = JSON.parse(readFileSync(packageFile, 'utf8'))
  return resolve(dirname(packageFile), typeof bin === 'string' ? bin : bin[binName])
}

function start(name, command, args, directory, env = {}) {
  return lifecycle.start(command, args, {
    name, cwd: join(root, directory), env: { ...process.env, ...env },
    logFile: join(logs, `${name}.log`),
  })
}

async function waitForPort(port) {
  const deadline = Date.now() + 120000
  while (!lifecycle.stopping && Date.now() < deadline) {
    const ready = await new Promise((resolve) => {
      const socket = connect({ host, port })
      const finish = (ready) => { socket.destroy(); resolve(ready) }
      socket.once('connect', () => finish(true))
      socket.once('error', () => finish(false))
      socket.setTimeout(500, () => finish(false))
    })
    if (ready) return
    await delay(250)
  }
  throw new Error(`等待端口 ${port} 就绪超时或启动已取消，请查看 ${logs}。`)
}

try {
  const [major, minor] = process.versions.node.split('.').map(Number)
  if (major !== 24 || minor < 21) throw new Error('需要 Node.js 24.21.0 或更高的 Node.js 24 LTS。')
  if (resourceBudget) {
    const usage = await sampleResourceUsage(resourceBudget.rootPid)
    if (!usage.pids.includes(process.pid)) throw new Error('资源监控根必须是当前启动器或其批次祖先进程。')
    const violation = getResourceViolation(usage, resourceBudget)
    if (violation) throw new Error(violation)
    resourceBudget.rootStartedAt = usage.rootStartedAt
  }
  const requiredPorts = webOnly ? [ports.web] : coreOnly ? [ports.mongo, ports.redis, ports.core] : Object.values(ports)
  for (const port of requiredPorts) {
    await new Promise((resolve, reject) => {
      const server = createServer()
      server.once('error', () => reject(new Error(`端口 ${port} 已被占用，未启动任何服务。请先停止原项目服务。`)))
      server.listen(port, host, () => server.close(resolve))
    })
  }
  if (!coreOnly) cliPath('apps/web', 'next', 'next')
  let MongoMemoryServer
  let secret
  if (!webOnly) {
    cliPath('apps/core', '@nestjs/cli', 'nest')
    const redisVersion = execFileSync('redis-server', ['--version'], { encoding: 'utf8' }).match(/\bv=([\d.]+)/)?.[1]
    if (redisVersion !== '8.10.2') throw new Error(`需要 Redis 8.10.2，当前为 ${redisVersion || '未知版本'}。`)
    ;({ MongoMemoryServer } = createRequire(join(root, 'package.json'))('mongodb-memory-server'))
    const secretFile = join(dataRoot, 'jwt-secret')
    if (testing) {
      for (const directory of [join(dataRoot, 'mongo'), redisDir, mediaRoot]) mkdirSync(directory, { recursive: true, mode: 0o700 })
      try { writeFileSync(secretFile, randomBytes(48).toString('hex'), { flag: 'wx', mode: 0o600 }) }
      catch (error) { if (error.code !== 'EEXIST') throw error }
    } else {
      for (const directory of [join(dataRoot, 'mongo'), redisDir, mediaRoot]) {
        if (!existsSync(directory)) throw new Error(`共享数据目录不存在：${directory}，未自动创建或复制数据库。`)
      }
    }
    secret = readFileSync(secretFile, 'utf8').trim()
    if (secret.length < 32) throw new Error('共享 jwt-secret 文件无效。')
  }
  if (process.argv.includes('--check')) {
    console.log('依赖、端口和共享数据路径检查通过；未启动服务。')
    process.exit(0)
  }
  mkdirSync(logs, { recursive: true, mode: 0o700 })
  lifecycle = createDevLifecycle(async () => {
    await mongoStart?.catch(() => {})
    await mongo?.stop({ doCleanup: false })
  }, resourceBudget)
  if (!webOnly) {
    mongo = new MongoMemoryServer({
      binary: { version: '7.0.45' },
      instance: { ip: host, port: ports.mongo, portGeneration: false, dbPath: join(dataRoot, 'mongo') },
    })
    mongoStart = mongo.start()
    await mongoStart
    const mongoLog = createWriteStream(join(logs, 'mongo.log'), { flags: 'a', mode: 0o600 })
    mongoLog.on('error', fail)
    mongoLog.write(`MongoDB 7.0.45 started on ${host}:${ports.mongo}\n`)
    mongo.instanceInfo.instance.mongodProcess.stdout.pipe(mongoLog, { end: false })
    mongo.instanceInfo.instance.mongodProcess.stderr.pipe(mongoLog, { end: false })
    mongo.instanceInfo.instance.once('instanceClosed', () => fail(new Error(`MongoDB 已退出，请查看 ${join(logs, 'mongo.log')}。`)))
    await start('redis', 'redis-server', ['--bind', host, '--port', String(ports.redis), '--dir', redisDir, '--appendonly', 'yes'], '.')
    await waitForPort(ports.redis)
    await start('core', process.execPath, [cliPath('apps/core', '@nestjs/cli', 'nest'), 'start', '-w', '--path', 'tsconfig.json', '--'], 'apps/core', { ...coreEnv, JWT_SECRET: secret })
    await waitForPort(ports.core)
  }
  if (!coreOnly) {
    await start('web', process.execPath, [cliPath('apps/web', 'next', 'next'), 'dev', '-H', host, '-p', String(ports.web)], 'apps/web', {
      MIX_SPACE_API_URL: webOnly ? (process.env.MIX_SPACE_API_URL || api) : api, NEXT_TELEMETRY_DISABLED: '1',
      ...(agentVerification ? { NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --max-old-space-size=1792`.trim() } : {}),
    })
    await waitForPort(ports.web)
  }
  if (!lifecycle.stopping) console.log(`${coreOnly ? '' : `博客 ${web}\n`}${webOnly ? '' : `接口 ${api}\n数据库 ${database}\n`}日志 ${logs}，按 Ctrl+C 停止本命令创建的服务。`)
} catch (error) {
  fail(error)
}
