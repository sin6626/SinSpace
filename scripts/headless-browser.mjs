// 独立的无头 Chromium（Playwright 缓存里的 headless shell），经 DevTools 协议驱动，不碰用户自己的浏览器。
// 截图脚本和浏览器回归测试共用。
import { spawn } from "node:child_process";

const bin = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function openBrowser({ port = 9333 } = {}) {
  const proc = spawn(bin, [`--remote-debugging-port=${port}`, `--user-data-dir=/tmp/sin-headless-${port}`, "--hide-scrollbars", "--no-first-run", "about:blank"], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; } catch { await sleep(200); } }
  if (!targets) { proc.kill(); throw new Error("无头浏览器没有启动"); }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0; const pending = new Map(); const listeners = [];
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else listeners.forEach((l) => l(m)); });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable"); await send("Runtime.enable");
  const errors = [];
  listeners.push((m) => { if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description?.slice(0, 200)); if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 200)); });

  return {
    send,
    errors,
    listeners,
    async setViewport(width, height, dpr = 1) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dpr, mobile: width < 640 });
    },
    // 整页打开（不是站内跳转），等 load 事件后再多等一会儿让客户端水合
    async goto(url, wait = 3500) {
      const loaded = new Promise((r) => listeners.push((m) => m.method === "Page.loadEventFired" && r()));
      await send("Page.navigate", { url });
      await loaded; await sleep(wait);
    },
    // 在页面里执行表达式（可 await），返回值按 JSON 取回；页面里抛错时这里也抛
    async evaluate(expression) {
      const { result } = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    },
    close() { ws.close(); proc.kill(); },
  };
}
