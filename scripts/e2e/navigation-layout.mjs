// 浏览器回归测试：站内跳转后的页面排版必须和直接打开该页面时一样。
// 背景（2026-10-27 的 bug）：Next 在站内跳转后会把上一页留在 DOM 里、只用 display: none 藏起来（React Activity），
// 首页的宽版布局原先用 .site-shell:has(.home-hero) 判断，被藏起来的首页仍然命中，导致从首页跳到作品页时套用了首页布局。
// 做法：先整页打开每个目标页记下“布局指纹”，再从别的页面点导航跳过去，比较两次指纹是否一致。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser, sleep } from "../headless-browser.mjs";
import { clickNav } from "./helpers.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";

// 布局指纹：页头内容宽度、页面主标题（可见的那个）的左边距、内页顶部夜空带是否出现
const fingerprint = `(() => {
  const title = [...document.querySelectorAll(".site-content h1")].find((h) => h.checkVisibility());
  return {
    headerWidth: Math.round(document.querySelector(".site-header-inner").getBoundingClientRect().width),
    titleLeft: title ? Math.round(title.getBoundingClientRect().left) : null,
    skyBand: getComputedStyle(document.querySelector(".site-shell"), "::before").content !== "none",
  };
})()`;

// 每条路线：先整页打开 start，再依次点导航跳到后面的地址；最后一站的指纹要等于直接打开它的指纹
const routes = [
  ["/", "/projects"],
  ["/", "/notes"],
  ["/", "/posts"],
  ["/projects", "/"],
  ["/", "/projects", "/"],
];

const browser = await openBrowser({ port: 9334 });
try {
  await browser.setViewport(1920, 991);
  const direct = {};
  for (const path of new Set(routes.flat())) {
    await browser.goto(base + path);
    direct[path] = await browser.evaluate(fingerprint);
  }
  // 首页和内页的布局本来就不同，否则这个测试比较不出任何东西
  assert.notDeepEqual(direct["/"], direct["/projects"], "首页与内页的布局指纹应当不同");

  for (const [start, ...steps] of routes) {
    await browser.goto(base + start);
    for (const step of steps) assert.equal(await browser.evaluate(clickNav(step)), step);
    const target = steps.at(-1);
    assert.deepEqual(await browser.evaluate(fingerprint), direct[target], `${[start, ...steps].join(" → ")} 的排版和直接打开 ${target} 不一样`);
    await sleep(100);
  }
  console.log(`PASS 站内跳转后排版与直接打开一致：${routes.map((r) => r.join(" → ")).join("；")}`);
} finally {
  browser.close();
}
