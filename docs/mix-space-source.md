# Mix Space 源码来源

导入日期：2026-10-22。来源仓库 `ShrioRenovation`，提交 `3ca2cc78064f9cca44826a854ba97546e372966a`。

- `apps/core` 对应原 `apps/mix-space/apps/core`，保留现有升级和本地修复。
- `packages/api-client` 对应原 `apps/mix-space/packages/api-client`，版本 2.4.2，作为 workspace SDK 使用。
- Core 许可证保留于 `apps/core/LICENSE`（AGPLv3），其引用的 `ADDITIONAL_TERMS.md` 同目录原样保留；SDK 的原 package 声明为 MIT，作者均保留。根项目不覆盖这些许可证。
- 原 Lexical 补丁保留于 `patches/`。未复制 `.env`、数据库、媒体、依赖、编译产物、后台或 Shiro 前端。
- 适配仅涉及 package 命令、SDK 构建版本/导出路径与源码位置；未修改 Core 业务源码。

新启动器复用旧 `.local` 的 MongoDB、按数据库区分的 Redis、数据库选择与认证密钥；Core 开发媒体路径显式指向旧 `apps/mix-space/apps/core/tmp`，以保持已有附件地址对应的数据。两个项目不可同时启动同一套本地服务。
