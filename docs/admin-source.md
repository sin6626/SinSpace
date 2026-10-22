# mx-admin 源码来源

2026-10-22 从旧 ShrioRenovation 的 apps/admin 导入，来源提交 `3ca2cc78064f9cca44826a854ba97546e372966a`，上游版本 6.4.0。

保留现有本地修复、GPLv3 LICENSE、作者和运行源码；未复制 .env、依赖、产物、锁文件、嵌套 workspace、历史聊天记录、发布流水线或 Git 钩子。保留 SDK 1.21.2，不自动切换前端使用的 workspace SDK。

原依赖 overrides、packageExtensions 与十份补丁需由根 pnpm workspace 管理。现有 Lexical 编辑入口保持不变，Plate 迁移另见计划。

后台 Webhook 页面路径为 `/extra-features/webhooks`。
