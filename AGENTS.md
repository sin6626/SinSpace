<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 项目文档与协作

- 中文沟通，先阅读 docs/README.md；学习项目按用户授权的小单元推进，不自动生成整站页面。
- 当前为 pnpm workspace：apps/web（Next）、apps/core（Mix Space）、packages/api-client（本地 SDK）。根安装依赖、维护单一锁文件；不复制 node_modules。Next 本地文档以 apps/web/node_modules/next/dist/docs 为准，保留自动生成说明。
- UI 使用 Base UI，自定义样式。导航采用官方状态驱动的 CSS 过渡；复杂业务动画以后使用 Motion。菜单文字统一左对齐、箭头独立在左；closeDelay=500 位于 apps/web/app/navigation-menu.tsx。
- API 基址仅通过 apps/web/lib/config.ts 读取环境配置，统一客户端在 lib/api.ts；SDK 异常回调必须保留 Next 内部控制异常。不要重新在组件内硬编码域名。
- pnpm dev 构建 SDK 后启动新前端、Core、MongoDB、Redis，不启动旧 Shiro 或 mx-admin。数据继续引用旧 .local，媒体引用旧 Core tmp；未获另行授权不搬迁、清空或写入真实内容。
- 默认本地提交，Conventional Commits 中文说明；不推送或部署。禁止批量删除；测试只开一套必要服务和一个独立无头浏览器，及时关闭自启资源，不干扰其他进程。普通 dev 不启用 Agent 内存预算。
- 2026-10-22：用户授权停止旧的本项目 Next 服务以迁移。SDK 构建、前后端类型、配置与 SDK 控制异常回归通过；真实联合启动与本地聚合读取通过。完整联调批次触发系统内存保护后已清理，未记为整批通过；后续单前端完成菜单动画/对齐/移动端检查，单 Mongo 复核四类内容指纹不变。结束时测试服务保持停止。详情 docs/workspace-migration.md。

- 文章列表与分类入口共用 apps/web/app/post-list.tsx；SDK getList 已补 categoryIds 透传，后端未改。Next 当前动态 slug 需先解码；导航 Suspense fallback 不得调用 usePathname 等 URL hook。详情未做，列表标题不生成死链。已实现入口使用默认预加载。分页/分类/刷新返回已验，整组浏览器检查遇内存保护后停止；修正编码路径后通过轻量回归与短手机检查，用户服务保持运行，测试浏览器已关闭。
