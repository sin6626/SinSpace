# 速记（思考）引用与卡片补全计划

状态：待做（2026-10-24 记录，用户确认后续必须补上）。

## 现状

- Core 已支持（`apps/core/src/modules/recently/recently.schema.ts`）：
  - **引用**：`refId` + `refType`（Post / Note / Page），一条速记可以关联站内一篇文章、手记或页面。
  - **卡片类型**：`type` 为 text、book、media、music、github、link、academic、code，`metadata` 按类型校验（书：标题/作者/封面/评分/ISBN；影视：标题/原名/封面/评分/类型；音乐：标题/歌手/专辑/封面；GitHub：仓库/描述/星标/语言；链接：标题/描述/图片；论文：标题/作者/arXiv；代码题：标题/难度/标签/平台）。
- 后台（`apps/admin/src/components/shorthand`）：新建/编辑只有一个文本框，不能选引用，也不能选类型、填卡片信息。应是上游 Innei 预留的坑位，后台界面还没实现。
- 前台（`apps/web/components/thinking-list.tsx`）：显示 Markdown 正文；引用已能拼出“引用：xxx”链接（文章用分类 id 换算 slug），但因后台无法设置引用，尚未用真实数据验证；卡片完全没做。
- Core 引用填充的隐私问题已修（c9172bf：不再返回被引用文档的正文与手记密码）。

## 待做

1. 后台速记编辑：增加“引用”选择（搜索文章/手记/页面）和“类型”切换，按类型显示对应的元数据表单。
2. 前台思考页：按类型渲染卡片（封面、标题、副信息、外链），外部图片与链接沿用 lib/safe-url.ts 只放行 http(s)；引用链接用真实数据验证。
3. 卡片样式等设计系统确定后统一做，在 /debug 加各类型卡片的展示。
4. 可选：点赞/点踩、评论（涉及访客提交，和评论功能一起考虑）。
