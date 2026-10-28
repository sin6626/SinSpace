// 浏览器回归测试：首屏强调词（“Sin”“大三学生”）在开灯/熄灯两种天色下都要从背景里跳出来（2026-10-28）。
// 曾经的问题：开灯时强调色是深梅紫，背景是淡紫到桃粉的黄昏，对比度其实有 3.2:1，但两者色相只差 20° 左右，看起来糊在一起。
// 所以除了 WCAG 对比度 ≥ 3（36px 大字的标准），开灯时还要求强调色与身后天空在 Lab 色相上相差 ≥ 60°（靠跳色区分，而不是只靠加深）。
// 背景取强调词正上方一条（行高留白里，没有文字）的截图像素平均值。
// 需要先运行 pnpm dev（默认 http://127.0.0.1:2323，可用 WEB_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser } from "../headless-browser.mjs";

const base = process.env.WEB_URL ?? "http://127.0.0.1:2323";
const browser = await openBrowser({ port: 9340 });

// 在页面里：读“大三学生”的文字颜色，截图上取它正上方 24px 高的一条背景，算对比度和 Lab 色相差
const measure = (png) => `(async () => {
  const toLinear = (c) => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const luminance = ([r, g, b]) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  const lab = ([r, g, b]) => {
    const [R, G, B] = [r, g, b].map(toLinear);
    const f = (t) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
    const [x, y, z] = [(0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, 0.2126 * R + 0.7152 * G + 0.0722 * B, (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883].map(f);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const strong = [...document.querySelectorAll(".home-hero-title strong")].at(-1);
  const color = getComputedStyle(strong).color.match(/[\\d.]+/g).slice(0, 3).map(Number);
  const r = strong.getBoundingClientRect();
  const image = new Image();
  image.src = "data:image/png;base64,${png}";
  await image.decode();
  const canvas = new OffscreenCanvas(Math.ceil(r.width), 24);
  const context = canvas.getContext("2d");
  context.drawImage(image, r.x, r.y - 30, r.width, 24, 0, 0, Math.ceil(r.width), 24);
  const { data } = context.getImageData(0, 0, Math.ceil(r.width), 24);
  const sky = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sky[c] += data[i + c] / (data.length / 4);
  const [l1, l2] = [luminance(color), luminance(sky)].sort((a, b) => b - a);
  const [a, b] = [lab(color), lab(sky)];
  const hue = ([, A, B]) => Math.atan2(B, A) * 180 / Math.PI;
  const hueGap = Math.abs(((hue(a) - hue(b) + 540) % 360) - 180);
  return { color, sky: sky.map(Math.round), contrast: +((l1 + 0.05) / (l2 + 0.05)).toFixed(2), hueGap: Math.round(hueGap) };
})()`;

try {
  await browser.setViewport(1920, 991);
  for (const theme of ["light", "dark"]) {
    await browser.goto(`${base}/`);
    await browser.evaluate(`localStorage.setItem("theme", "${theme}")`);
    await browser.goto(`${base}/`, 4500);
    const png = (await browser.send("Page.captureScreenshot", { format: "png" })).result.data;
    const result = await browser.evaluate(measure(png));
    console.log(theme, JSON.stringify(result));
    assert.ok(result.contrast >= 3, `${theme}：强调词对比度 ${result.contrast} 不足 3:1`);
    if (theme === "light") assert.ok(result.hueGap >= 60, `开灯时强调词和天空色相只差 ${result.hueGap}°，会糊在一起`);
  }
  console.log("hero-emphasis-color: 通过");
} finally {
  browser.close();
}
