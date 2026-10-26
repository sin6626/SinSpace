# 设计系统盘点（2026-10-26，只读，未改样式）

前台 `apps/web` 目前是 Base UI 示例风格（直角、1px 实线边框、硬投影），按用户 2026-10-23 的决定“最后再统一做色彩设计”。本文记录现状，作为设计系统落地时逐项替换的清单。后台 `apps/admin`（mx-admin 原样式）不在本次范围。

## 已有的变量（`app/globals.css` 开头）

| 类别 | 变量 | 现值（浅色 / 深色） |
| --- | --- | --- |
| 背景 / 前景 | `--background` / `--foreground` | #ffffff / #0a0a0a；#171717 / #ededed |
| 边框 | `--border` | #e4e4e7 / #27272a |
| 弱化 | `--muted` / `--muted-foreground` | #f4f4f5 / #18181b；#52525b / #a1a1aa |
| 交互 | `--accent`（悬停）/ `--accent-active`（按下） | #f4f4f5 / #27272a；#e4e4e7 / #3f3f46 |
| 焦点 | `--ring` | 同前景色 |
| 阴影 | `--shadow-popup` | 0.25rem 0.25rem 0 硬投影（深色无） |
| 层级 | `--z-popup` / `--z-toast` / `--z-skip-link` | 2 / 3 / 4 |
| 宽度 | `--layout-max-width` / `--article-max-width` | 84rem / 48rem |
| 字体 | `--font-sans` / `--font-mono` | Geist（中文回落 PingFang SC / 微软雅黑）/ Geist Mono |

- 颜色只用中性灰阶，**没有品牌色 / 强调色**，链接、选中态都靠前景色 + 下划线或边框区分。
- 颜色全部用 `light-dark()` 定义，组件 CSS 里没有写死的色值（已检查）。
- 没有成功 / 警告 / 错误的语义色：报错只靠文字和 `role="alert"`。

## 散落在组件里、还没变成变量的取值

- **字号**（10 种）：0.875rem×22、0.8125rem×7、1.25rem×5、1.125rem×3、1.5rem×2、0.75rem×2、2rem、1.75rem、1.0625rem、0.875em。页面标题手机 28px、640px 起 32px。
- **行高**（9 种）：1.75×3、1.25rem×3、1.7×2、1rem、1.85、1.5、1.4、1.3、1。
- **字重**：600×11、400×4、700、650。约定“选中态不改字重”。
- **间距**（rem）：0.75×29、0.5×23、1×23、1.5×19、0.25×10、0.375×7、2×5、0.125×4、1.25×3、3×3、0.875×2、2.5×2，以及 0.625、2.25、2.75 各一次。
- **圆角**：全部直角（3 处显式 0）。
- **动画**：导航用 Base UI 的 `--duration` / `--easing`；路由切换 120ms 淡出 / 180ms 上移淡入（`globals.css` 末尾）。

## 组件清单（`apps/web/components`）

- 布局与导航：resizable-layout、navigation / navigation-menu、theme-switcher、notifications（Toast、在线人数、正在阅读）
- 列表：post-list、note-list、project-list、friend-list、say-list、thinking-list、timeline-list、result-list、home-latest
- 详情：post-detail、note-detail、page-detail、article-body（Markdown + Shiki）、rich-content（Haklex 富文本）、article-toc、article-ai、article-stats、tweet
- 右栏：post-sidebar、note-sidebar、sidebar-search、default-details、subscribe-form
- 表单与互动：comments、comment-form、link-apply-form、note-unlock、recently-attitude

`/debug` 已按 11 个分区集中展示各组件状态：导航菜单、文章列表、首页、搜索与筛选、手记与作品、时间线/友链/一言/思考、评论、邮件订阅、通知 Toast、文章正文、页面切换动画。设计系统落地时以它做对照页。

## 富文本另有一套变量

Haklex 渲染器用自己的 `--rc-*` 变量（`@haklex/rich-style-token`）：字体（文章无衬线、手记思源宋体）、字号 16px、行高 1.8 等。设计系统定下来后需要把这套变量映射到我们的变量上，否则正文和站点其余部分会是两套风格。

## 落地前需要确定

1. 视觉方向：是否有 UI 设计稿；保留直角硬投影，还是换风格。
2. 品牌色 / 强调色，以及成功 / 警告 / 错误语义色。
3. 字体：中文是否用网络字体；手记是否沿用 Shiro 的衬线体。
4. 字号、间距、圆角、阴影的阶梯（把上面散落的取值收敛成固定几档）。
