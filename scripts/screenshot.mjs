// 独立无头 Chromium 截图（用 Playwright 缓存里的 headless shell，经 DevTools 协议驱动，不碰用户自己的浏览器）。
// 用法：node scripts/screenshot.mjs shots.json，shots.json 是数组：{ url, out, size?: [宽, 高], theme?: "light"|"system", wait?: 毫秒, eval?: "滚动等脚本" }。
// 内置浏览器面板不在屏幕上时无法截图，用这个代替。
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const bin = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const port = 9333;
const proc = spawn(bin, [`--remote-debugging-port=${port}`, "--user-data-dir=/tmp/sin-shot-profile", "--hide-scrollbars", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; } catch { await sleep(200); } }
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map(); const listeners = [];
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else listeners.forEach((l) => l(m)); });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable"); await send("Runtime.enable");
const errors = [];
listeners.push((m) => { if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description?.slice(0, 200)); if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 200)); });
const shots = JSON.parse(readFileSync(process.argv[2], "utf8"));
for (const s of shots) {
  const [w, h] = s.size ?? [1280, 800];
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: s.dpr ?? 1, mobile: w < 640 });
  const script = await send("Page.addScriptToEvaluateOnNewDocument", { source: s.theme ? `localStorage.setItem("theme", ${JSON.stringify(s.theme)})` : `localStorage.removeItem("theme")` });
  const loaded = new Promise((r) => listeners.push((m) => m.method === "Page.loadEventFired" && r()));
  await send("Page.navigate", { url: s.url });
  await loaded; await sleep(s.wait ?? 3500);
  if (s.eval) { await send("Runtime.evaluate", { expression: s.eval, awaitPromise: true }); await sleep(800); }
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 80, captureBeyondViewport: false });
  writeFileSync(s.out, Buffer.from(shot.result.data, "base64"));
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: script.result.identifier });
  console.log("shot", s.out);
}
if (errors.length) console.log("页面错误:", JSON.stringify([...new Set(errors)], null, 1));
ws.close(); proc.kill();
