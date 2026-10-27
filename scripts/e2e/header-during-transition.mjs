// 浏览器回归测试：换页动画进行中，顶部导航栏必须一直清晰可见。
// 背景（2026-10-27 的 bug）：从作品页跳回首页时导航栏短暂消失。首页第一屏用负外边距铺到导航栏底下，
// 视图过渡期间整页画面（包括不透明的星空）作为一层叠在导航栏上面淡入，把导航栏盖住了。
// 检查：在换页动画进行到约 200ms 时截图，量导航栏里站名文字最亮处的亮度，必须接近动画结束后的亮度。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser, sleep } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const routes = [["/projects", "/"], ["/posts", "/"], ["/", "/notes"]];

// 点导航后等到新页面的进场动画走到约 200ms（此时新页面还是半透明的）再返回
const clickAndWaitMidTransition = (href) => `(async () => {
  document.querySelector('.navigation-List a[href="${href}"]').click();
  for (let i = 0; i < 600; i++) {
    const enter = document.getAnimations().find((a) => a.animationName === "page-enter");
    if (enter && enter.currentTime >= 200) return true;
    await new Promise((r) => requestAnimationFrame(r));
  }
  return false;
})()`;

// 在页面里把截图画到画布上，取某个矩形区域里最亮像素的亮度（0–255）
const brightest = (png, rect) => `(async () => {
  const image = new Image();
  image.src = "data:image/png;base64,${png}";
  await image.decode();
  const canvas = new OffscreenCanvas(${Math.ceil(rect.width)}, ${Math.ceil(rect.height)});
  const context = canvas.getContext("2d");
  context.drawImage(image, ${rect.x}, ${rect.y}, ${rect.width}, ${rect.height}, 0, 0, ${rect.width}, ${rect.height});
  const { data } = context.getImageData(0, 0, ${Math.ceil(rect.width)}, ${Math.ceil(rect.height)});
  let max = 0;
  for (let i = 0; i < data.length; i += 4) max = Math.max(max, 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
  return Math.round(max);
})()`;

const screenshot = async (browser) => (await browser.send("Page.captureScreenshot", { format: "png" })).result.data;

const browser = await openBrowser({ port: 9336 });
try {
  await browser.setViewport(1920, 991);
  const results = [];
  for (const [from, to] of routes) {
    await browser.goto(base + from);
    assert.equal(await browser.evaluate(clickAndWaitMidTransition(to)), true, `${from} → ${to} 没有出现换页动画`);
    const during = await screenshot(browser);
    await sleep(1500);
    const after = await screenshot(browser);
    const rect = await browser.evaluate(`(() => { const r = document.querySelector(".site-brand").getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
    const [mid, end] = [await browser.evaluate(brightest(during, rect)), await browser.evaluate(brightest(after, rect))];
    results.push(`${from} → ${to}：动画中 ${mid} / 结束后 ${end}`);
    assert.ok(mid >= end * 0.85, `${from} → ${to} 换页动画中导航栏被盖住了：站名最亮处只有 ${mid}，结束后是 ${end}`);
  }
  console.log(`PASS 换页动画中导航栏清晰可见（站名最亮处亮度）：${results.join("；")}`);
} finally {
  browser.close();
}
