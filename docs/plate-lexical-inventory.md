# Lexical 内容盘点（Plate 迁移第一步）

生成日期：2026-10-23。数据库：`shrio-import-20261014`。由 `scripts/inventory-lexical.mjs` 只读生成，未修改任何内容，不含正文。

共 13 篇 Lexical 内容，39 种节点类型。

## 节点类型

| 类型 | 出现次数 | 所在篇数 | 最大深度 | 关键属性 | 出现在（不超过 2 篇时列出） |
| --- | --- | --- | --- | --- | --- |
| `text` | 1143 | 13 | 5 | — | — |
| `paragraph` | 283 | 13 | 4 | 字段：$ | — |
| `heading` | 114 | 11 | 2 | 级别：h1、h2、h3、h4、h5、h6；字段：$、tag | — |
| `listitem` | 98 | 7 | 4 | 字段：checked、value | — |
| `linebreak` | 48 | 6 | 5 | — | — |
| `tablecell` | 47 | 3 | 3 | 字段：backgroundColor、colSpan、headerState、rowSpan、verticalAlign | — |
| `list` | 44 | 7 | 3 | 列表类型：bullet、check、number；字段：$、listType、start、tag | — |
| `image` | 23 | 8 | 2 | 字段：$、altText、caption、height、src、thumbhash、width | — |
| `horizontalrule` | 19 | 4 | 1 | 字段：$ | — |
| `link` | 19 | 9 | 3 | 字段：rel、target、title、url | — |
| `code` | 17 | 2 | 4 | 字段：$、language；语言：python | 文章:frp-vite-localhost-502-public-ipv6-reload-proxy、文章:rich-text-components-20261014 |
| `code-block` | 15 | 4 | 2 | 语言：css、javascript、ts、tsx、typescript、vue；字段：$、code、language | — |
| `root` | 13 | 13 | 0 | — | — |
| `tablerow` | 13 | 3 | 2 | — | — |
| `alert-quote` | 8 | 4 | 2 | 字段：$、alertType、content | — |
| `quote` | 7 | 6 | 1 | 字段：$ | — |
| `katex-inline` | 5 | 2 | 4 | 字段：equation | 文章:shouping-splash-page-architecture-evolution-fullscreen-transition、文章:rich-text-components-20261014 |
| `banner` | 5 | 1 | 1 | 字段：$、bannerType、content | 文章:rich-text-components-20261014 |
| `table` | 3 | 3 | 1 | 字段：$、colWidths | — |
| `gallery` | 3 | 1 | 1 | 字段：$、images、layout | 文章:rich-text-components-20261014 |
| `katex-block` | 2 | 2 | 2 | 字段：$、equation | 文章:view-transitions-api-theme-switch-animation-origin-analysis、文章:rich-text-components-20261014 |
| `tab` | 2 | 2 | 4 | — | 文章:shouping-splash-page-architecture-evolution-fullscreen-transition、文章:rich-text-components-20261014 |
| `link-card` | 2 | 2 | 1 | 字段：$、description、id、source、title、url | 文章:plate-v1-vs-v2-comparison、文章:rich-text-components-20261014 |
| `details` | 2 | 1 | 1 | 字段：$、open、summary | 文章:rich-text-components-20261014 |
| `autolink` | 1 | 1 | 2 | 字段：isUnlinked、rel、target、url | 文章:rich-text-components-20261014 |
| `video` | 1 | 1 | 1 | 字段：$、height、poster、src、width | 文章:rich-text-components-20261014 |
| `code-snippet` | 1 | 1 | 1 | 字段：$、files | 文章:rich-text-components-20261014 |
| `mermaid` | 1 | 1 | 1 | 字段：$、diagram | 文章:rich-text-components-20261014 |
| `nested-doc` | 1 | 1 | 1 | 字段：$、content | 文章:rich-text-components-20261014 |
| `grid-container` | 1 | 1 | 1 | 字段：$、cells、cols、gap | 文章:rich-text-components-20261014 |
| `excalidraw` | 1 | 1 | 1 | 字段：$、snapshot | 文章:rich-text-components-20261014 |
| `ruby` | 1 | 1 | 2 | 字段：reading | 文章:rich-text-components-20261014 |
| `spoiler` | 1 | 1 | 2 | — | 文章:rich-text-components-20261014 |
| `tag` | 1 | 1 | 2 | — | 文章:rich-text-components-20261014 |
| `comment` | 1 | 1 | 2 | — | 文章:rich-text-components-20261014 |
| `mention` | 1 | 1 | 2 | 字段：displayName、handle、platform | 文章:rich-text-components-20261014 |
| `embed` | 1 | 1 | 1 | 字段：$、source、url | 文章:rich-text-components-20261014 |
| `footnote` | 1 | 1 | 2 | 字段：identifier | 文章:rich-text-components-20261014 |
| `footnote-section` | 1 | 1 | 1 | 字段：$、definitions | 文章:rich-text-components-20261014 |

## 文本格式

| 格式 | 次数 |
| --- | --- |
| 行内代码 | 196 |
| 加粗 | 126 |
| 斜体 | 15 |
| 下划线 | 8 |
| 删除线 | 2 |
| 下标 | 1 |
| 上标 | 1 |
| 高亮 | 1 |

## 图片与媒体来源

| 节点 · 域名 | 次数 |
| --- | --- |
| image · 127.0.0.1:2333 | 23 |
| video · interactive-examples.mdn.mozilla.net | 1 |

## 逐篇概况

| 内容 | 标题 | 节点数 | 最大深度 | 解析 |
| --- | --- | --- | --- | --- |
| 文章:frp-vite-localhost-502-public-ipv6-reload-proxy | 【FRP + Vite 踩坑记录】localhost 能访问，公网却 502？排查 IPv6、服务重载与代理重名 | 308 | 5 | 正常 |
| 文章:react-vs-vue-learning-experience | React学习心得分享: React 对比 Vue | 495 | 5 | 正常 |
| 文章:view-transitions-api-theme-switch-animation-origin-analysis | 基于 View Transitions 的主题切换水波动画圆心偏移排查与重构 | 210 | 3 | 正常 |
| 文章:shouping-splash-page-architecture-evolution-fullscreen-transition | 从展示页到网站入口：首屏页（Shouping）的架构演进与开门动画转场实践 | 303 | 4 | 正常 |
| 文章:plate-v1-vs-v2-comparison | Plate V1 和 V2对比 | 49 | 3 | 正常 |
| 文章:rich-text-components-20261014 | 富文本组件对照：后台编辑器与博客前台 | 286 | 5 | 正常 |
| 手记:2 | 2026年4月18号博客建站的第一天 | 24 | 3 | 正常 |
| 手记:6 | 社会篇: 第一天的实习 | 55 | 3 | 正常 |
| 手记:7 | gsap官方文档的更新和Svg线条动画的探索 | 52 | 3 | 正常 |
| 手记:8 | 塞翁失马，焉知非福 | 41 | 2 | 正常 |
| 手记:9 | 前端已死&世事无常 | 33 | 3 | 正常 |
| 手记:10 | 出租屋的最后一晚 | 63 | 4 | 正常 |
| 页面:about | 关于我 | 31 | 3 | 正常 |
