# Admin 工具链浏览器检查

使用 Node 24.21.0、pnpm 10.28.2、Chrome 和已有 Playwright。只连接本机隔离后台。先由测试环境负责人生成会话 Cookie 文件，权限设为 `0600`，不能写入 Git。脚本只读取会话，拦截所有非 Socket.IO 写请求，不会登录、保存文章或上传文件。

从仓库根目录执行检查，`PLAYWRIGHT_MODULE` 指向现有 Playwright 的 `index.mjs`，不需要添加应用依赖。

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  node apps/admin/test/toolchain-browser.mjs \
  http://127.0.0.1:9629/admin-a1/ \
  .local/upgrade/A1/session-cookie .local/upgrade/A1/production
```

生产产物必须在独立工作树安装自己的依赖。下面的命令在 `apps/admin` 中运行。`9629` 必须为空闲端口。浏览器检查结束后停止自己启动的预览进程。

```sh
corepack pnpm install --frozen-lockfile --ignore-scripts
corepack pnpm exec tsc --noEmit --incremental false
VITE_APP_BASE_API=http://127.0.0.1:2433 \
VITE_APP_GATEWAY=http://127.0.0.1:2433 \
VITE_APP_WEB_URL=http://127.0.0.1:2423 \
VITE_APP_PUBLIC_URL=/admin-a1/ \
  corepack pnpm exec vite build --mode production \
  --outDir ../../.local/upgrade/A1/dist
VITE_APP_PUBLIC_URL=/admin-a1/ \
  corepack pnpm exec vite preview --host 127.0.0.1 --port 9629 \
  --strictPort --outDir ../../.local/upgrade/A1/dist
```

检查覆盖 Vue 登录表单、Vue 中挂载 React 编辑器、DOM 选区、后续键盘输入、主题更新、白板绘制与关闭未保存确认框、图片弹层、Monaco 输入与两个 worker，以及离开路由后的 React 重新挂载。结果和截图仅写到指定本地目录。它不证明登录提交、文章保存、上传完成、白板撤销后的模型内容或全部编辑器节点兼容。

检查 Vite 开发服务时，在脚本末尾加 `--development`。开发模式的 Monaco worker 来自 Vite 的依赖路径；生产模式仍严格检查 worker 位于配置的子路径下。

2026-10-15 核验的组合为 Vite 8.3.4、Vue/compiler-sfc 3.5.44、React/DOM 19.3.0。保留 Vue 插件 6.0.3、JSX 插件 5.1.3 及原 UnoCSS 锁定版本。inspector 从 5.3.2 更新到首个明确接受 Vite 8 的 5.4.0。

依据为 [Vite 8.3.4 发布](https://github.com/vitejs/vite/releases/tag/v8.3.4)、[Vite 8 Oxc 迁移指南](https://vite.dev/guide/migration.html)、[Vue 3.5.44 发布](https://github.com/vuejs/core/releases/tag/v3.5.44)、[React 19.3.0 发布](https://github.com/react/react/releases/tag/v19.3.0) 和 [inspector 5.4.0 peer](https://registry.npmjs.org/vite-plugin-vue-inspector/5.4.0)。

现有 Haklex 0.0.85 依赖仍报告 lucide-react 0.577.0 不符合 `^0.574.0`、局部 shiki 4.0.1 不符合 `^3.0.0`，以及 Excalidraw 0.17.0 的 React peer 仅声明 17/18。这些版本已存在于升级前锁文件，本阶段不升级它们。白板交互通过不能替代上游 peer 支持声明。

已初始化 Core 对 `/init` 返回 404。旧、新 Admin 都在登录页触发这个请求；`systemApi.checkInit` 将 404 解释为已初始化，但响应拦截器先显示错误提示。脚本单独记录这一既有行为，其他 HTTP 错误仍失败。认证契约与提示修复留给 H1/H2。
