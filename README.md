# Yozora

Sin’s Yozora（夜空）：个人博客学习项目，使用 Next.js 前端与 Mix Space Core 后端，由 pnpm workspace 管理。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

前端位于 `apps/web`，后端位于 `apps/core`，共享 SDK 位于 `packages/api-client`。

开发地址为 http://127.0.0.1:2323。默认复用相邻 ShrioRenovation 的现有本地数据库与媒体，不能同时启动旧项目的同一套服务，不启动管理后台。

详细配置、单独启动与验证命令见 [本地开发](docs/local-development.md)。学习顺序见 [文档入口](docs/README.md)，导入源码与许可证见 [来源记录](docs/mix-space-source.md)。
