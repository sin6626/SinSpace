import { fork, spawn } from 'node:child_process'
import { closeSync, createWriteStream, openSync } from 'node:fs'
import { finished } from 'node:stream/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { getResourceViolation, sampleResourceUsage, validateResourceBudget } from './resource-budget.mjs'

export function createDevLifecycle(stopMongo, resourceBudget) {
  const budget = resourceBudget ? validateResourceBudget(resourceBudget) : null
  const watcher = fork(new URL(import.meta.url), ['--watchdog', JSON.stringify(budget)], {
    detached: true, stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  })
  const pending = new Map()
  let nextId = 0
  let stopping
  let exitCode = 0
  const exited = new Promise((resolve) => {
    watcher.once('exit', (code, signal) => {
      const error = new Error(`本地进程看护已退出 (${signal || code})。`)
      for (const request of pending.values()) request.reject(error)
      pending.clear()
      resolve()
      if (!stopping) fail(error)
      else if (code !== 0) exitCode = 1
    })
    watcher.once('error', (error) => { resolve(); fail(error) })
  })
  watcher.on('message', ({ id, resourceStop, resourceUsage }) => {
    if (resourceStop || resourceUsage) {
      if (process.connected && process.send) {
        try {
          process.send(resourceStop ? { type: 'resource-stop', message: resourceStop } : { type: 'resource-usage', usage: resourceUsage }, () => {})
        } catch {}
      }
      return
    }
    pending.get(id)?.resolve()
    pending.delete(id)
  })

  function fail(error) {
    console.error(error instanceof Error ? error.message : String(error))
    void stop(1)
  }

  function stop(code = 0) {
    exitCode ||= code
    if (stopping) return stopping
    stopping = Promise.resolve().then(async () => {
      try {
        if (watcher.connected) watcher.disconnect()
      } catch (error) {
        console.error(error.message)
        exitCode = 1
        watcher.kill('SIGTERM')
      }
      await exited
      try { await stopMongo() } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        exitCode = 1
      }
      process.exit(exitCode)
    })
    return stopping
  }

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => void stop())
  process.on('uncaughtException', fail)
  process.on('unhandledRejection', fail)

  return {
    get stopping() { return Boolean(stopping) },
    fail,
    stop,
    start(command, args, options) {
      if (stopping) return Promise.reject(new Error('启动已取消。'))
      const id = ++nextId
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject })
        watcher.send({ id, command, args, options }, (error) => {
          if (error) { pending.delete(id); reject(error); fail(error) }
        })
      })
    },
  }
}

if (process.argv[2] === '--watchdog' && process.send) {
  const children = new Set()
  const logDrains = new Set()
  let stopping
  let exitCode = 0
  let resourceTimer

  async function checkResources(budget) {
    try {
      const usage = await sampleResourceUsage(budget.rootPid)
      if (stopping) return
      if (process.connected) process.send({ resourceUsage: usage }, () => {})
      const violation = getResourceViolation(usage, budget)
      if (violation) throw new Error(violation)
      resourceTimer = setTimeout(() => void checkResources(budget), 1000)
    } catch (error) {
      if (stopping) return
      if (process.connected) {
        try { process.send({ resourceStop: error.message }, () => {}) } catch {}
      }
      fail(error)
    }
  }

  function signalGroup(child, signal) {
    if (!child.pid) { children.delete(child); return false }
    try {
      process.kill(-child.pid, signal)
      return true
    } catch (error) {
      if (error.code === 'ESRCH') {
        children.delete(child)
        return false
      }
      // macOS 退出中的进程组可能短暂返回 EPERM，保留记录直到 ESRCH 确认退出。
      if (signal === 0 && error.code === 'EPERM') return true
      fail(error)
      return true
    }
  }

  function fail(error) {
    console.error(error instanceof Error ? error.message : String(error))
    void stop(1)
  }

  function stop(code = 0) {
    exitCode ||= code
    if (stopping) return stopping
    clearTimeout(resourceTimer)
    stopping = Promise.resolve().then(async () => {
      for (const child of children) signalGroup(child, 'SIGTERM')
      const deadline = Date.now() + 8000
      while (children.size && Date.now() < deadline) {
        await delay(100)
        for (const child of children) signalGroup(child, 0)
      }
      for (const child of children) signalGroup(child, 'SIGKILL')
      await Promise.all(logDrains)
      await Promise.all([process.stdout, process.stderr].map((stream) => new Promise((resolve) => stream.write('', resolve))))
      process.exit(exitCode)
    })
    return stopping
  }

  process.on('message', ({ id, command, args, options }) => {
    if (stopping) return
    let log
    try {
      log = openSync(options.logFile, 'a', 0o600)
      const mirror = options.name === 'web'
      const child = spawn(command, args, {
        cwd: options.cwd, env: options.env, detached: true, stdio: ['ignore', mirror ? 'pipe' : log, mirror ? 'pipe' : log],
      })
      children.add(child)
      if (mirror) {
        const output = createWriteStream(options.logFile, { fd: log, autoClose: true })
        log = undefined
        output.on('error', fail)
        const drained = new Promise((resolve) => {
          child.once('close', () => {
            output.end()
            void finished(output).catch(() => {}).then(resolve)
          })
        })
        logDrains.add(drained)
        void drained.then(() => logDrains.delete(drained))
        child.stdout.pipe(output, { end: false })
        child.stderr.pipe(output, { end: false })
        child.stdout.pipe(process.stdout, { end: false })
        child.stderr.pipe(process.stderr, { end: false })
      }
      child.once('error', fail)
      child.once('spawn', () => {
        if (process.connected) process.send({ id }, (error) => { if (error) void stop() })
      })
      child.once('exit', (code, signal) => {
        signalGroup(child, 0)
        if (!stopping) fail(new Error(`${options.name} 已退出 (${signal || code})，请查看 ${options.logFile}。`))
      })
    } catch (error) {
      fail(error)
    } finally {
      if (log !== undefined) closeSync(log)
    }
  })
  process.on('disconnect', () => void stop())
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => void stop())
  process.on('uncaughtException', fail)
  process.on('unhandledRejection', fail)

  if (process.argv[3] && process.argv[3] !== 'null') {
    try {
      const budget = validateResourceBudget(JSON.parse(process.argv[3]))
      resourceTimer = setTimeout(() => void checkResources(budget), 1000)
    } catch (error) { fail(error) }
  }
}
