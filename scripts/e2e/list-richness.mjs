// 浏览器回归测试：列表“不能冷清”（2026-10-29 用户定）与时间线按月分组。
// ① 文章、手记列表每一条都有摘要（顺序：AI 摘要 → 自己写的摘要 → 正文开头）和一行信息（阅读时长、阅读数等）；
//    AI 摘要前有小星标记；② 时间线按年、再按月分组，每月标题上的篇数等于该月条目数，条目只写“日”。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const browser = await openBrowser({ port: 9360 });
try {
  await browser.setViewport(1920, 991);
  const report = [];
  for (const path of ["/posts", "/notes"]) {
    await browser.goto(base + path, 4500);
    const entries = await browser.evaluate(`[...document.querySelectorAll(".entry")].filter((e) => e.checkVisibility()).map((e) => ({
      title: e.querySelector(".entry-title")?.textContent,
      excerpt: e.querySelector(".entry-excerpt")?.textContent?.trim() ?? "",
      ai: !!e.querySelector(".entry-ai"),
      stats: e.querySelector(".entry-stats")?.textContent ?? "",
    }))`);
    assert.ok(entries.length > 0, `${path} 没有条目`);
    const bare = entries.filter((entry) => !entry.excerpt || !/约 \d+ 分钟/.test(entry.stats));
    assert.deepEqual(bare.map((entry) => entry.title), [], `${path} 有条目缺摘要或信息行`);
    report.push(`${path} ${entries.length} 条（AI 摘要 ${entries.filter((entry) => entry.ai).length} 条）`);
  }

  await browser.goto(`${base}/timeline`, 4000);
  const months = await browser.evaluate(`[...document.querySelectorAll(".timeline-month")].map((m) => ({
    label: m.querySelector(".timeline-month-label").textContent.replace(/\\s+/g, ""),
    count: Number(m.querySelector(".timeline-month-label .timeline-count").textContent.match(/\\d+/)[0]),
    items: m.querySelectorAll(".timeline-item").length,
    days: [...m.querySelectorAll(".timeline-item time")].every((t) => /^\\d{2} 日$/.test(t.textContent)),
  }))`);
  assert.ok(months.length > 1, "时间线应当按月分组");
  for (const month of months) {
    assert.equal(month.count, month.items, `${month.label} 的篇数应当等于条目数`);
    assert.ok(month.days, `${month.label} 的条目应当只写“日”`);
  }
  console.log(`PASS 列表不冷清：${report.join("，")}，每条都有摘要和信息行；时间线按 ${months.length} 个月分组，篇数一致`);
} finally {
  browser.close();
}
