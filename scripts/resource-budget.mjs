import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

export function validateResourceBudget({ rootPid = process.pid, rootStartedAt, maxRssMiB, minFreePercent }) {
  if (!Number.isSafeInteger(rootPid) || rootPid <= 1) throw new Error('资源监控 rootPid 必须是大于 1 的进程号。')
  if (!Number.isFinite(maxRssMiB) || maxRssMiB <= 0) throw new Error('资源监控 maxRssMiB 必须是正数。')
  if (!Number.isFinite(minFreePercent) || minFreePercent <= 0 || minFreePercent > 100) throw new Error('资源监控 minFreePercent 必须在 0 到 100 之间且大于 0。')
  if (rootStartedAt !== undefined && (typeof rootStartedAt !== 'string' || !rootStartedAt.trim() || /[\r\n]/.test(rootStartedAt))) throw new Error('资源监控 rootStartedAt 必须是有效的进程启动时间。')
  return { rootPid, ...(rootStartedAt === undefined ? {} : { rootStartedAt }), maxRssMiB, minFreePercent }
}

export function parseResourceUsage(processTable, pressure, rootPid, pressureLevel) {
  if (![1, 2, 4].includes(pressureLevel)) throw new Error('无法解析 macOS 内存压力等级，停止本轮。')
  const rows = processTable.trim().split('\n').map((line) => {
    const values = line.trim().split(/\s+/).map(Number)
    if (values.length !== 3 || values.some((value) => !Number.isSafeInteger(value) || value < 0)) throw new Error('无法解析进程内存采样，停止本轮。')
    const [pid, ppid, rssKiB] = values
    return { pid, ppid, rssKiB }
  })
  const root = rows.find((row) => row.pid === rootPid)
  if (!root) throw new Error(`资源监控根进程 ${rootPid} 已退出，停止本轮。`)
  const children = new Map()
  for (const row of rows) {
    if (!children.has(row.ppid)) children.set(row.ppid, [])
    children.get(row.ppid).push(row)
  }
  const visited = new Set()
  const queue = [root]
  let rssKiB = 0
  for (let index = 0; index < queue.length; index++) {
    const row = queue[index]
    if (visited.has(row.pid)) continue
    visited.add(row.pid)
    rssKiB += row.rssKiB
    queue.push(...children.get(row.pid) || [])
  }
  const percentage = pressure.match(/System-wide memory free percentage:\s*(\d+(?:\.\d+)?)%/)
  const freePercent = percentage ? Number(percentage[1]) : NaN
  if (!Number.isFinite(freePercent) || freePercent < 0 || freePercent > 100) throw new Error('无法解析 macOS 内存压力，停止本轮。')
  return { rootPid, pids: [...visited], rssMiB: rssKiB / 1024, freePercent, pressureLevel }
}

export async function sampleResourceUsage(rootPid) {
  if (process.platform !== 'darwin') throw new Error('当前资源监控只支持 macOS，无法确认预算时不启动服务。')
  const options = { encoding: 'utf8', timeout: 2000, killSignal: 'SIGKILL', maxBuffer: 4 * 1024 * 1024, env: { ...process.env, LC_ALL: 'C' } }
  const results = await Promise.allSettled([
    run('/bin/ps', ['-axo', 'pid=,ppid=,rss='], options),
    run('/usr/bin/memory_pressure', ['-Q'], options),
    run('/bin/ps', ['-p', String(rootPid), '-o', 'lstart='], options),
    run('/usr/sbin/sysctl', ['-n', 'kern.memorystatus_vm_pressure_level'], options),
  ])
  if (results.slice(0, 2).some((result) => result.status === 'rejected')) throw new Error('资源采样失败或超过 2 秒，停止本轮。')
  if (results[3].status === 'rejected') throw new Error('无法读取系统内存压力等级，停止本轮。')
  const usage = parseResourceUsage(results[0].value.stdout, results[1].value.stdout, rootPid, Number(results[3].value.stdout.trim()))
  if (results[2].status === 'rejected' || !results[2].value.stdout.trim()) throw new Error('无法确认监控根进程身份，停止本轮。')
  return { ...usage, rootStartedAt: results[2].value.stdout.trim() }
}

export function getResourceViolation(usage, budget) {
  if (usage.rootPid !== budget.rootPid || !usage.pids.includes(budget.rootPid)
    || !Number.isFinite(usage.rssMiB) || usage.rssMiB < 0
    || !Number.isFinite(usage.freePercent) || usage.freePercent < 0 || usage.freePercent > 100
    || ![1, 2, 4].includes(usage.pressureLevel)) return '资源采样无效，停止本轮。'
  if (budget.rootStartedAt !== undefined && usage.rootStartedAt !== budget.rootStartedAt) return '资源监控根进程身份已变化，停止本轮。'
  if (usage.pressureLevel === 4) return '系统内存压力已达到严重等级，停止本轮。'
  if (usage.pressureLevel === 2 && usage.freePercent < 30) return '系统内存压力警告且余量不足 30%，停止本轮。'
  // RSS 合计是保守的进程监控值，不是操作系统硬配额；共享页可能重复计数。
  if (usage.rssMiB >= budget.maxRssMiB) return `资源超限，进程树 RSS ${Math.ceil(usage.rssMiB)} MiB，停止阈值 ${budget.maxRssMiB} MiB。`
  if (usage.freePercent < budget.minFreePercent) return `系统内存余量 ${usage.freePercent}%，低于停止阈值 ${budget.minFreePercent}%。`
  return null
}
