// 浏览器回归测试：页脚星带与页脚排版（2026-10-30）。
// 星带：每列一周、每行一个星期几，格子数是周数 × 7，有力扣和 GitHub 两种颜色的星；图例可以点，关掉一类星星（只剩很淡的远星），
// 两样都有的日子换成另一边的颜色，再点恢复；
// 页脚：桌面上星带下面左右两栏（左边那句话和落款、右边链接和在线人数），手机上合成一栏居中。
// 星带的数据来自力扣和 GitHub，离线时会取不到、整块隐藏，这时只检查页脚排版。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser, sleep } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const inspect = `(() => {
  const footer = document.querySelector(".site-footer");
  const box = (selector) => { const r = footer.querySelector(selector).getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top) }; };
  const band = footer.querySelector(".footer-sky-band");
  const cells = band ? [...band.children] : [];
  return {
    weeks: band ? Number(getComputedStyle(band.parentElement).getPropertyValue("--weeks")) : 0,
    cells: cells.length,
    leetcode: cells.filter((c) => c.matches(".is-leetcode, .is-both")).length,
    github: cells.filter((c) => c.matches(".is-github, .is-both")).length,
    titled: cells.filter((c) => c.title).every((c) => /^\\d{4}-\\d{2}-\\d{2}( · (LeetCode|GitHub) \\d+)+$/.test(c.title)),
    legend: [...footer.querySelectorAll(".footer-sky-legend button")].map((b) => b.textContent + ":" + b.getAttribute("aria-pressed")),
    about: box(".site-footer-about"),
    side: box(".site-footer-side"),
    inner: box(".site-footer-inner"),
  };
})()`;

// 点图例关掉力扣：只有力扣的日子变成远星（透明度约 0.1），两样都有的日子换成 GitHub 的颜色；再点恢复
const star = `((selector) => { const cell = document.querySelector(".footer-sky-band " + selector); const before = getComputedStyle(cell, "::before"); return { opacity: Number(before.opacity), color: getComputedStyle(cell).color }; })`;
async function toggleCheck() {
  const click = (name) => browser.evaluate(`[...document.querySelectorAll(".footer-sky-legend button")].find((b) => b.textContent === "${name}").click()`);
  const sample = () => browser.evaluate(`({ lc: ${star}(".is-leetcode[data-level='4']"), both: ${star}(".is-both"), github: ${star}(".is-github"), hide: document.querySelector(".footer-sky").dataset.hide ?? "", pressed: document.querySelector(".footer-sky-legend .is-leetcode").getAttribute("aria-pressed") })`);
  const before = await sample();
  await click("LeetCode");
  await sleep(500);
  const hidden = await sample();
  assert.equal(hidden.hide, "leetcode");
  assert.equal(hidden.pressed, "false");
  assert.ok(before.lc.opacity > 0.9 && hidden.lc.opacity < 0.15, `关掉后力扣的亮星应变成远星：${before.lc.opacity} → ${hidden.lc.opacity}`);
  assert.equal(hidden.both.color, hidden.github.color, "两样都有的日子应换成 GitHub 的颜色");
  assert.equal(hidden.github.opacity, before.github.opacity, "GitHub 的星不受影响");
  await click("LeetCode");
  await sleep(500);
  const restored = await sample();
  assert.deepEqual([restored.hide, restored.lc.opacity], ["", before.lc.opacity], "再点一次恢复");
  return `点图例关掉力扣：亮星透明度 ${before.lc.opacity} → ${hidden.lc.opacity}，再点恢复`;
}

const browser = await openBrowser({ port: 9365 });
try {
  const report = [];
  for (const [width, height] of [[1920, 991], [390, 844]]) {
    await browser.setViewport(width, height);
    await browser.goto(`${base}/posts`, 5000);
    const footer = await browser.evaluate(inspect);
    if (footer.cells) {
      assert.equal(footer.cells, footer.weeks * 7, "格子数应是周数 × 7");
      assert.ok(footer.leetcode > 0 && footer.github > 0, "应有力扣和 GitHub 两种星");
      assert.ok(footer.titled, "悬停文字应是“日期 · 来源 次数”");
      assert.deepEqual(footer.legend, ["LeetCode:true", "GitHub:true"]);
      if (width >= 640) report.push(await toggleCheck());
    }
    if (width >= 640) {
      assert.ok(footer.about.right < footer.side.left, "桌面上左右两栏并排");
      assert.equal(footer.side.top < footer.about.top + 40, true, "两栏顶部对齐");
    } else {
      assert.ok(footer.side.top > footer.about.top, "手机上两栏上下排");
    }
    report.push(`${width}px ${footer.cells ? `${footer.weeks} 周、力扣 ${footer.leetcode} 天、GitHub ${footer.github} 天` : "星带未取到数据"}`);
  }
  assert.deepEqual(browser.errors, [], `页面报错：${browser.errors.join("\n")}`);
  console.log(`PASS 页脚星带与排版：${report.join("；")}`);
} finally {
  browser.close();
}
