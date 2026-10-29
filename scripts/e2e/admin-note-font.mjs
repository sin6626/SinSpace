// 浏览器回归测试：后台手记编辑器的正文用思源宋体（2026-10-29）。
// 曾经的问题：Haklex 手记主题只写了字体名、不加载字体文件，电脑没装思源宋体时落到系统宋体（Songti SC），
// 它自带的英文数字比汉字小、悬在基线上方，中英混排看着不在一条线上。
// 后台编辑器要登录才能打开，所以用夹具页 apps/admin/test/note-font.html：走后台同一套 Vite 管线，
// 加载 Haklex 样式和 note-serif-font 模块，按手记主题和文章主题各排一段文字。
// 检查：① 手记的字体栈以 Noto Serif SC Variable 开头，且中文、英文数字都真的由它渲染（字体切片已下载）；② 文章主题仍是苹方，不受影响。
// 需要先运行 pnpm dev（后台默认 http://127.0.0.1:9528，可用 ADMIN_URL 覆盖）。用法：pnpm e2e
import assert from "node:assert/strict";
import { openBrowser } from "../headless-browser.mjs";

const admin = process.env.ADMIN_URL ?? "http://127.0.0.1:9528";
const browser = await openBrowser({ port: 9341 });

try {
  await browser.setViewport(1100, 300);
  await browser.goto(`${admin}/test/note-font.html`, 6000);
  const result = await browser.evaluate(`(async () => {
    await document.fonts.ready;
    const family = (id) => getComputedStyle(document.getElementById(id)).fontFamily;
    await Promise.all([document.fonts.load('18px "Noto Serif SC Variable"', '块'), document.fonts.load('18px "Noto Serif SC Variable"', 'AI 330')]);
    return {
      note: family("note"),
      article: family("article"),
      cjk: document.fonts.check('18px "Noto Serif SC Variable"', '块钱'),
      latin: document.fonts.check('18px "Noto Serif SC Variable"', 'AI Grok 330'),
    };
  })()`);
  assert.match(result.note, /^"Noto Serif SC Variable"/, `手记字体栈没有以思源宋体开头：${result.note}`);
  assert.ok(result.cjk && result.latin, "思源宋体的中文或英文数字切片没有加载");
  assert.match(result.article, /^"PingFang SC"/, `文章主题的字体被改了：${result.article}`);
  console.log("admin-note-font: 通过");
} finally {
  browser.close();
}
