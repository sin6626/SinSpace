// 浏览器回归测试：页头里的站名、导航、右侧工具在三种语言下互不重叠（2026-10-30）。
// 英文、日文的导航文字比中文长，页头原来固定和正文同宽（56rem），导航被挤到压住站名“Sin's Space”和右边的头像按钮。
// 检查：铺开（页面顶部）和展开（列表页往下滚）两种状态下，站名、每个导航项、工具区两两不相交，且都在页头框内；
// 平板（1024px 以下）放不下整排导航，换成菜单按钮。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser, sleep } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const measure = `(() => {
  const header = document.querySelector(".site-header");
  const island = header.querySelector(".island");
  const box = (element) => { const r = element.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom) }; };
  const parts = [
    { name: "站名", ...box(island.querySelector(".site-brand")) },
    ...[...island.querySelectorAll(".island-nav .navigation-List > *")].filter((e) => e.checkVisibility()).map((e) => ({ name: e.textContent.trim(), ...box(e) })),
    { name: "工具", ...box(island.querySelector(".island-tools")) },
    ...[...island.querySelectorAll(".mobile-menu-trigger")].filter((e) => e.checkVisibility()).map((e) => ({ name: "菜单按钮", ...box(e) })),
  ].filter((part) => part.right > part.left);
  return { mode: header.dataset.mode, island: box(island), viewport: innerWidth, parts };
})()`;

function problems({ island, viewport, parts }) {
  const found = [];
  // 桌面是整排导航（6 项以上）；1024px 以下换成菜单按钮
  const desktop = viewport >= 1024;
  if (desktop && parts.filter((part) => !["站名", "工具", "菜单按钮"].includes(part.name)).length < 6) found.push("桌面上导航没有整排显示");
  if (!desktop && !parts.some((part) => part.name === "菜单按钮")) found.push("窄屏上没有菜单按钮");
  for (let i = 0; i < parts.length; i++) {
    const a = parts[i];
    if (a.left < Math.max(0, island.left) - 1 || a.right > Math.min(viewport, island.right) + 1) found.push(`${a.name} 超出页头（${a.left}–${a.right}，页头 ${island.left}–${island.right}）`);
    for (const b of parts.slice(i + 1)) {
      if (a.left < b.right - 1 && b.left < a.right - 1) found.push(`${a.name}（${a.left}–${a.right}）与 ${b.name}（${b.left}–${b.right}）重叠`);
    }
  }
  return found;
}

const browser = await openBrowser({ port: 9364 });
try {
  const report = [];
  const failures = [];
  for (const [width, height] of [[1920, 991], [1280, 800], [1024, 768], [768, 1024]]) {
    await browser.setViewport(width, height);
    for (const prefix of ["", "/en", "/ja"]) {
      await browser.goto(`${base}${prefix}/posts`, 4000);
      const bar = await browser.evaluate(measure);
      assert.equal(bar.mode, "bar");
      failures.push(...problems(bar).map((text) => `${width}px ${prefix || "/zh"} 铺开：${text}`));
      // 列表页往下滚：岛保持为展开的导航条
      await browser.evaluate("window.scrollTo(0, 600), window.dispatchEvent(new Event('scroll'))");
      await sleep(900);
      const expanded = await browser.evaluate(measure);
      assert.equal(expanded.mode, "expanded");
      failures.push(...problems(expanded).map((text) => `${width}px ${prefix || "/zh"} 展开：${text}`));
      report.push(`${width}${prefix || "/zh"} ${bar.island.right - bar.island.left}/${expanded.island.right - expanded.island.left}px`);
    }
  }
  assert.deepEqual(failures, [], "页头有重叠");
  console.log(`PASS 页头站名、导航、工具三种语言下互不重叠（铺开/展开宽度）：${report.join("，")}`);
} finally {
  browser.close();
}
