# pnpm workspace 迁移记录

2026-10-22，按用户授权将后端源码复制进新项目，继续使用同一份本地数据。

## 验收目标

- apps/web 为新前端，apps/core 为既有 Mix Space 后端副本，packages/api-client 为同源 SDK。
- 根 pnpm workspace 和锁文件统一管理依赖；不复制 node_modules、数据库或管理后台。
- pnpm dev 启动前端、Core、MongoDB、Redis，不启动 Shiro 或后台。
- 原 .local 数据库选择、MongoDB、Redis 与 Core 附属文件继续复用。冲突时拒绝启动，不结束其他项目进程。
- SDK 集中创建，接口基址从环境配置读取；导航使用 SDK 聚合方法。
- 菜单文字左对齐、箭头独立靠左，保留 Base UI 行为并增加官方状态驱动过渡，关闭等待仍为 500ms。

## 执行单元

- [x] 核对现有源码、资源归属与 SDK；用户已授权停止当前前端。
- [ ] 修正菜单对齐与过渡，移动前端至 apps/web。
- [ ] 导入后端与 SDK 源码及许可证；建立 workspace 和统一锁文件。
- [ ] 接入 SDK、集中接口配置，完成联合启动与进程收尾。
- [ ] 静态检查、SDK 请求、菜单交互、启动与停止验证。

后端导入与启动器由独立工作树处理；主线程负责前端、根 workspace 和验证。依赖安装、构建、类型检查、服务和浏览器检查串行执行。验证期间最多一套服务与一个独立无头浏览器。日常 dev 不注入 Agent 内存预算。
