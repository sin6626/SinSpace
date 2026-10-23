<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 项目文档与协作

- 中文沟通，先阅读 docs/README.md；学习项目按用户授权的小单元推进，不自动生成整站页面。
- 当前为 pnpm workspace：apps/web（Next）、apps/core（Mix Space）、packages/api-client（本地 SDK）。根安装依赖、维护单一锁文件；不复制 node_modules。Next 本地文档以 apps/web/node_modules/next/dist/docs 为准，保留自动生成说明。
- UI 使用 Base UI，自定义样式。导航采用官方状态驱动的 CSS 过渡；复杂业务动画以后使用 Motion。菜单文字统一左对齐、箭头独立在左；closeDelay=500 位于 apps/web/components/navigation-menu.tsx。
- API 基址仅通过 apps/web/lib/config.ts 读取环境配置，统一客户端在 lib/api.ts；SDK 异常回调必须保留 Next 内部控制异常。不要重新在组件内硬编码域名。
- pnpm dev（与 dev:all 相同）构建 SDK 后启动新前端、Core、MongoDB、Redis 和本仓库 mx-admin，不启动旧 Shiro；dev:web/dev:core/dev:admin 可单独启动，不要在 dev 之上再开 dev:admin。数据继续引用旧 .local，媒体引用旧 Core tmp；未获另行授权不搬迁、清空或写入真实内容。
- 默认本地提交，Conventional Commits 中文说明；不推送或部署。禁止批量删除；测试只开一套必要服务和一个独立无头浏览器，及时关闭自启资源，不干扰其他进程。普通 dev 不启用 Agent 内存预算。
- 2026-10-22：用户授权停止旧的本项目 Next 服务以迁移。SDK 构建、前后端类型、配置与 SDK 控制异常回归通过；真实联合启动与本地聚合读取通过。完整联调批次触发系统内存保护后已清理，未记为整批通过；后续单前端完成菜单动画/对齐/移动端检查，单 Mongo 复核四类内容指纹不变。结束时测试服务保持停止。详情 docs/workspace-migration.md。

- 文章列表与分类入口共用 apps/web/components/post-list.tsx；SDK getList 已补 categoryIds 透传，后端未改。Next 当前动态 slug 需先解码；导航 Suspense fallback 不得调用 usePathname 等 URL hook。详情未做，列表标题不生成死链。已实现入口使用默认预加载。分页/分类/刷新返回已验，整组浏览器检查遇内存保护后停止；修正编码路径后通过轻量回归与短手机检查，用户服务保持运行，测试浏览器已关闭。

- 2026-10-22：用户明确后续富文本改用 Plate，不继续引入 Lexical 前端渲染；计划见 docs/plate-content-plan.md。当前详情只渲染 Markdown/GFM，旧 Lexical 使用已有 text 副本并提示简化阅读，不改原 JSON，不做评论或编辑器。SDK fetch 适配器保留 HTTP status 用于详情 404。

- 2026-10-22：用户选择 Next 缓存，不引入 React Query。公开数据函数集中在 apps/web/lib/blog-data.ts；时间单位秒，错误由页面处理，禁止缓存鉴权/访客状态。Mix Space已有webhook但本轮只读调研，现已实现签名接收，日常库仍需手动登记，见 docs/webhook-local.md。宽度变量在 globals.css 开头，84rem容器/48rem正文。说明见 docs/cache-and-layout.md。

- 2026-10-22：apps/admin 已导入现有 mx-admin，dev:admin 仅启动后台，dev:all 联合启动。Webhook 校验原始体 HMAC，文章三事件使 posts/categories 缓存立即过期；隔离库真实 CRUD/健康检查/重发验证通过，测试记录已清理，不写日常文章。通知已按下文 Base UI Toast 实施，见 docs/notification-center-plan.md。后台浏览器冷启动两次超资源预算并清理，尚无登录/表单成功证据；不得重复重型尝试或提高预算。用户已授权测试后恢复日常前后端服务。
- 本轮收尾已恢复普通 `pnpm dev` 日常前后端，使用原本机 shrio-import-20261014 库，公开列表仍为13篇。隔离服务和测试浏览器已关闭；（2026-10-23 起 pnpm dev 默认包含后台。）

- 2026-10-22：通知改为 Base UI 官方 Toast，文案/时长集中 apps/web/lib/notification-copy.ts，样式 notifications.css。复用 Core /web Socket.IO，公开新文章全站提示，修改/删除仅对应文章房间。无已读/历史/新管理员入口，不公开后台投递记录。Webhook缓存失效与访客消息独立，不声称弹窗代表缓存已刷新。
- Toast 本轮实际浏览器使用协议替身通过显示/悬停/关闭/超时/手机/文章房间进出，真实 Core 网关握手通过；未做日常文章写入。新增依赖后曾遇旧 Next 进程持续热更新，重启后通过。浏览器已关闭，日常服务已恢复。
- 2026-10-23：颜色、焦点、阴影、层级变量集中在 apps/web/app/globals.css 开头，深色只在那里定义一次；组件 CSS 禁止硬编码色值或嵌套 prefers-color-scheme。页面标题手机 28px、640px 起 32px。2026-10-23 用户决定：先保持 Base UI 示例风格（直角、实线边框、硬投影）看整体效果，最后再按设计系统统一做色彩设计；在此之前不改视觉方向。连续快速改 CSS 时 Turbopack 曾漏编译，验证样式应以浏览器实际输出的 CSS 为准。
- 2026-10-23：路由切换动画使用 React 19.3 原生 `<ViewTransition default="page-switch">`，只包 layout.tsx 的 main；样式在 globals.css 末尾（旧内容淡出 120ms、新内容上移淡入 180ms，root 不动画，覆盖层不拦截点击，减少动态效果时关闭）。未装 Motion，未做方向滑动和加载小球。
- 2026-10-23：开发环境导航末尾有“调试”入口，/debug 集中展示导航三态、文章列表加载/失败/空、三种 Toast 本地触发、Markdown 正文样式；生产环境入口隐藏、页面 notFound。新增可见状态或组件时同步加到 apps/web/app/debug/page.tsx，尽量直接复用真实组件。Next 会用 Activity 隐藏保留上一页面，DOM 里出现两份 h1 属正常。
- 2026-10-23：可复用组件统一放 apps/web/components/（导航、通知、文章列表/详情、可拖动布局及其 CSS），app/ 只保留路由、layout 和 globals.css；路由文件用 `@/components/...` 引用。
- 2026-10-23：新增 /notes（每页 10 条）、/notes/[nid] 详情和 /projects 列表，组件在 components/note-list、note-detail、project-list，数据函数 getNotes/getNote/getProjects 在 blog-data.ts（标签 blog:notes、blog:note:<id>、blog:projects）。Mix Space 的 prev 是较新、next 是较早；加密手记公开列表不返回，详情 403 时只提示不提供密码输入。作品只做列表，链接/头像只放行 http(s)。Webhook 事件对照见下条。日期统一用 lib/date.ts 的 formatDate。
- 2026-10-23：Webhook 接收端改为“事件 → 缓存标签”对照表（route.ts 的 kindTags）：文章、手记、页面、分类、话题的增删改，以及备份恢复的 CONTENT_REFRESH；后台需勾选这 16 个事件，不勾“全部事件”。作品无可勾选事件，缓存 5 分钟。前端新展示一类后台内容时，必须同步加事件映射和 scripts/verify-webhook.mjs，保证后台改动前端能生效。
- 2026-10-23：后台“页面”走 /[slug]（components/page-detail.tsx，getPage 标签 blog:pages、blog:page:<id>），导航“关于”链接恢复默认预加载；导航首页入口文字为 Sin。坑：`"use cache"` 函数里抛出的错误会丢失 SDK 的 HTTP status，详情页曾因此把 404 显示成“读取失败”；现在 getPost/getNote/getPage 在缓存函数内把 404 转成 null、手记 403 转成 { locked: true }，组件据此 notFound()。判断 404 不要 grep “could not be found”（每个页面的 RSC 数据里都有），要看浏览器实际正文。新增动态 app/[slug] 后，lint 会把字面量 "/xxx" 的 <a> 当站内页面报错。
- 2026-10-23：首页 = 标题 Sin + 最新 5 篇文章 + 最新 5 篇手记（components/home-latest.tsx，复用 getPosts(1)/getNotes(1) 缓存，两块分别处理失败）。Core 默认置顶文章排最前，getPosts 取 pin 并在列表/首页标“置顶”。首页内容是默认方案，用户可再调整。
