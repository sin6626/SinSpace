# 本地开发

更新日期：2026-10-22。已采用 pnpm workspace，参见[技术决策](./technical-decisions.md)与[迁移记录](./workspace-migration.md)。

## 目录与依赖

- `apps/web`：Next.js 新前端。
- `apps/core`：从旧项目复制的 Mix Space 后端源码，保留已有修复。
- `apps/admin`：现有 mx-admin 管理后台，保留原编辑器。
- `packages/api-client`：同源 Mix Space SDK，通过 `workspace:*` 被前端引用。
- 根 `pnpm-workspace.yaml`、`pnpm-lock.yaml` 统一管理依赖。只在根目录安装；不复制旧项目 node_modules。

使用 Node.js 24.21.0 或更高的 Node.js 24 LTS，pnpm 12.6.0。首次运行 `pnpm install --frozen-lockfile`。本机还需已有 Redis 8.10.2；MongoDB 7.0.45 使用现有缓存的二进制与数据目录。

## 命令

| 命令 | 实际行为 |
| --- | --- |
| `pnpm dev` | 构建 SDK，启动 MongoDB、Redis、本仓库 Core、新前端与后台（同 `dev:all`） |
| `pnpm dev:web` | 构建 SDK，只启动新前端；Core 需已运行或设置其他 API 基址 |
| `pnpm dev:admin` | 仅启动本仓库后台，要求 Core 已运行 |
| `pnpm dev:all` | 启动前端、Core、数据库与后台 |
| `pnpm dev:core` | 只启动 MongoDB、Redis 与本仓库 Core |
| `pnpm dev:check` | 检查依赖、端口和共享数据路径，不启动服务 |
| `pnpm build:sdk` | 构建 workspace SDK 的运行文件与类型 |
| `pnpm build` | 依次构建 SDK、新前端；不启动或构建后台 |
| `pnpm lint` / `pnpm typecheck` | 新前端静态检查 |
| `pnpm typecheck:core` | Core 类型检查 |
| `pnpm verify` | 启动配置与 SDK 请求边界的轻量回归，无真实服务 |

`pnpm dev` 不启动旧 Shiro 或 mx-admin。Core 仍保留其已有后台相关接口，但不会启动后台开发进程。

## 地址和配置

| 服务 | 地址 |
| --- | --- |
| 新前端 | `http://127.0.0.1:2323` |
| Core | `http://127.0.0.1:2333`，开发模式无 `/api/v2` 前缀 |
| 管理后台 | `http://127.0.0.1:9528` |
| MongoDB | `127.0.0.1:27018` |
| Redis | `127.0.0.1:6380` |

启动器读取根目录 `.env.local`，可参考根 `.env.example`。进程已设置的环境变量优先。`.env.example` 本身不会被读取；没有 `.env.local` 时，`pnpm dev` 仍会向前端进程注入本地 API 地址，所以现有页面使用的是环境变量，而不是模板文件。需要自定义时再把模板复制成根 `.env.local`，该文件不会提交到 Git。

- `MIX_SPACE_API_URL`：前端服务端请求地址。联合启动强制注入本次启动的本地 Core 地址；`dev:web` 可用此变量指定其他地址，默认本地 Core。部署时必须显式配置，不再默认访问线上博客。
- `MIX_SPACE_DATA_ROOT`：默认相邻 `ShrioRenovation/.local`。复用其中的 `database`、`mongo/`、按库分目录的 `redis/`、`jwt-secret`。
- `MIX_SPACE_MEDIA_ROOT`：默认旧 `ShrioRenovation/apps/mix-space/apps/core/tmp`，复用上传文件及认证附属文件。

生产环境在部署平台设置环境变量，直接部署 `apps/web` 时也可使用该应用的环境文件。接口基址由 `apps/web/lib/config.ts` 校验，SDK 由 `apps/web/lib/api.ts` 创建。导航调用 SDK 聚合方法；公开读取不携带管理凭据，8 秒超时；公开数据函数使用 Next 缓存，见[缓存与阅读宽度](./cache-and-layout.md)。

## 共享数据和退出

这是共享同一份本机数据，不是复制数据库。旧目录仍需保留；迁移数据位置必须单独操作。禁止两个项目同时启动这套服务。端口占用或原数据目录缺失时，启动器报错退出，不接管已有服务，也不悄悄创建替代日常库。

Ctrl+C、子进程异常或启动器退出时，watchdog 清理本命令创建的进程。不会清空数据库、删除媒体或关闭其他项目。日志位于新项目 `.local/logs/`。

Agent 验证使用外部资源监控或显式 `--test` + `SIN_VERIFY=1`，普通 `pnpm dev` 不采样内存或超限停机。`--test` 使用新项目 `.local/verification` 与独立端口，不连接日常库。

Webhook 配置和隔离验证见[本地 Webhook 与后台测试](./webhook-local.md)。后台来源见[导入记录](./admin-source.md)。
