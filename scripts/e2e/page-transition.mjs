// 浏览器回归测试：页面切换动画不能把整页画面缩放变形。
// 背景（2026-10-27 的 bug）：视图过渡原先套在 <main> 上，首页的 main 铺满全屏、内页只有 48rem 宽，
// 浏览器默认会让过渡层在两种尺寸之间变形，首页画面在 0.25 秒里被压缩进窄栏，看起来像“屏幕突然缩小”。
// 检查：点导航后立刻抓取视图过渡的动画，页面切换那一层（::view-transition-group）的宽度和水平位置必须前后不变，
// 并且旧画面、新画面用的是我们自己设计的动画（page-leave / page-enter）。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser } from "../headless-browser.mjs";
import { clickNavAndCaptureTransition } from "./helpers.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const routes = [["/", "/projects"], ["/projects", "/"], ["/posts", "/notes"]];
const translateX = (transform) => (transform?.match(/matrix\(1, 0, 0, 1, ([-\d.]+),/) ?? [])[1] ?? "0";

const browser = await openBrowser({ port: 9335 });
try {
  await browser.setViewport(1920, 991);
  for (const [from, to] of routes) {
    await browser.goto(base + from);
    const animations = await browser.evaluate(clickNavAndCaptureTransition(to));
    const label = `${from} → ${to}`;
    const groups = animations.filter((a) => a.pseudo.startsWith("::view-transition-group(") && a.pseudo !== "::view-transition-group(root)");
    assert.ok(groups.length, `${label} 没有页面切换的视图过渡`);
    for (const group of groups) {
      const widths = new Set(group.frames.map((f) => f.width));
      const xs = new Set(group.frames.map((f) => translateX(f.transform)));
      assert.equal(widths.size <= 1 && xs.size <= 1, true, `${label} 的过渡层在变形：宽度 ${[...widths].join(" → ")}，水平位置 ${[...xs].join(" → ")}`);
    }
    const names = animations.map((a) => a.name);
    assert.ok(names.includes("page-leave") && names.includes("page-enter"), `${label} 没有用 page-leave / page-enter 动画：${names.join(", ")}`);
  }
  console.log(`PASS 页面切换时过渡层不变形，旧/新画面使用 page-leave / page-enter：${routes.map((r) => r.join(" → ")).join("；")}`);
} finally {
  browser.close();
}
