# 文章图片尺寸：以后再做的方案

状态：暂缓（2026-10-30 用户决定）。先用前台样式给文章里的高图限高（见下方“已做”），不够用时再按本方案做“编辑器里拖大小、每张图各自存尺寸”。

## 问题

写文章时放一张很高的人物全身照，正文里它是整栏宽、非常高，又不能缩小，很难看。碎碎念已经能拖角缩放（docs/murmur-plan.md），文章还不行。

## 现状（2026-10-30 查过）

- 后台写文章用 Haklex 富文本编辑器（Lexical，本地版本 0.0.85；线上后台是 0.0.98）。
- Haklex 的图片节点只存：`src`、`alt`、`caption`、`width`/`height`（图片原始宽高，用来占位，不是显示大小）、`thumbhash`、`accent`。**没有“显示大小”字段**。
- 编辑器里图片的工具栏只能改替代文字（Alt text）、说明（Caption）和替换图片（Replace image），不能调大小。
- 前台渲染器（@haklex/rich-renderer-image）点图会放大预览，显示宽度固定是正文全宽。
- Markdown 文章（react-markdown）的图片同样是全宽，没有尺寸写法。

## 已做（先顶上）

前台样式给文章正文里的图片设最大高度 min(70vh, 42rem)，太高的图等比缩小、居中；宽图和比栏窄的小图不受影响。只改前台 CSS（apps/web/components/post-detail.css），已有文章立即生效，不动数据。富文本图片的外框宽度和比例是 Haklex 写的行内样式，要用 `width: fit-content !important` 覆盖，而且只在加载完（`.rr-image-loaded`）后生效，否则加载前占位框会塌；Markdown 图片直接给 img 设 max-height + width: auto（比栏窄的 Markdown 小图因此从靠左变成居中，和富文本一致）。回归测试 scripts/e2e/article-tall-images.mjs。

## 以后真要做时的方案

目标：和碎碎念一致，编辑时四角/四边按比例拖动，存“占正文宽度的百分比”。

1. **数据格式**：图片节点加一个可选字段（如 `displayWidth`，10–100 的百分比，不写即 100%）。Markdown 文章沿用碎碎念的写法 `![](地址 "w=40%")`（规则在 apps/web/lib/murmur.ts、apps/admin/src/views/murmurs/murmur-images.ts）。
2. **要打补丁的 Haklex 包**（用 pnpm patch / patch-commit，见 AGENTS.md 里 Haklex 补丁的注意事项）：
   - 编辑器里的图片节点：`exportJSON`/`importJSON` 读写新字段，否则保存时会丢；
   - @haklex/rich-renderer-image：编辑态（ImageEditRenderer）加拖动手柄，可以照搬后台碎碎念的 apps/admin/src/views/murmurs/image-stage.tsx 的拖动、吸附、方向键逻辑；只读态和静态渲染按百分比设宽度；
   - @haklex/rich-headless：Core 校验正文和 `pnpm draft` 都用它重新加载节点，不认新字段也会丢。
3. **版本**：补丁绑在具体版本上，本地 0.0.85 和线上 0.0.98 不同，部署前要按线上版本重做或先统一版本。
4. **不受影响的**：Core 的图片引用登记只看 `src`，不用改。
5. **测试**：节点读写往返不丢字段（verify 脚本），后台拖动（照 scripts/e2e/admin-murmurs.mjs 的拦截写法，不写库），前台按百分比显示（e2e）。
