# 缓存与阅读宽度调整

2026-10-22。本轮采用 Next Cache Components，不引入 React Query。目录入口见 [README](./README.md)。

## 宽度在哪里改

编辑 `apps/web/app/globals.css` 开头的 `:root`：

```css
--layout-max-width: 84rem;
--article-max-width: 48rem;
```

- `--layout-max-width` 控制整个三栏容器上限。此前为 72rem，本轮改为 84rem。左右栏默认仍为 14rem 和 20rem，增量分配给中间。
- `--article-max-width` 控制详情正文的阅读宽度上限，此前为 42rem。正文仍不能超过中栏减去内边距后的宽度；仅增大这个值不一定能看到变化。
- 默认 1rem = 16px。宽屏下 84rem 的容器是 1344px，扣除 224px 左栏、320px 右栏和两条 1px 分隔线，中栏约 798px；原来约 606px。
- 可以依次试 80rem、84rem、88rem，正文试 44rem、48rem、52rem。屏幕比容器上限窄时，不会强行撑出视口。
- 分隔线拖动仅调整当前页面的临时比例。要改变侧栏默认宽度，需同步修改 `resizable-layout.tsx` 的 `defaultSize` 与 `globals.css` 的大屏 Grid 列宽；本轮没有调整侧栏。

## 缓存时间在哪里改

编辑 `apps/web/lib/blog-data.ts` 中相应函数的 `cacheLife`。**单位全部是秒**。

| 函数 | 内容 | stale | revalidate | expire |
| --- | --- | --- | --- | --- |
| `getNavigationData` | 导航分类与独立页面 | 300 | 3600 | 86400 |
| `getCategories` | 列表分类信息 | 300 | 3600 | 86400 |
| `getPosts` | 按页码和分类区分的文章列表 | 60 | 60 | 300 |
| `getPost` | 按分类与文章 slug 区分的公开正文 | 60 | 300 | 3600 |

- `stale`：浏览器路由缓存可复用内容而不检查服务端的时间。
- `revalidate`：达到此时间后，下次服务端访问触发后台更新，期间可能返回旧结果；不是轮询定时器。
- `expire`：达到硬过期边界后，新请求需要等待新结果。保持大于 `revalidate`。

例如想让文章列表更频繁地检查更新，可以先将该函数的 `revalidate` 从 60 改为 15。浏览器路由缓存也会影响观察结果；不要把“页面没变化”等同于后台没有重新请求。

SDK 传输层仍是 `no-store`：外层 `use cache` 命中时不会调用 SDK；外层缓存需要填充或更新时，SDK 实际请求后端。这样只有数据函数管理本轮新增的缓存时间。函数错误交给页面处理，不缓存“读取失败”的页面输出。

缓存只保存阅读所需的公开字段，不包括鉴权凭据、SDK 响应元数据或按访客变化的 `liked` 状态。未来草稿、私密阅读和管理操作不能直接复用这些公开读取函数。

## Mix Space 已有的发布通知

源码已确认存在 `apps/core/src/modules/webhook/webhook.service.ts`，不需要新增一套发布事件系统。

- 可订阅 `POST_CREATE`、`POST_UPDATE`、`POST_DELETE`，以及 `CATEGORY_*`、`PAGE_*` 事件。
- 请求头提供 `X-Webhook-Event`、`X-Webhook-Signature256`、`X-Webhook-Timestamp` 等。SHA256 签名是对原始 JSON 请求体计算的 HMAC，密钥来自 webhook 配置；接收端应对原始请求体校验，不能先随意重排 JSON。
- 创建或修改 webhook 会先发送 `health_check`。文章更新事件约有 1 秒防抖，投递本身是异步的；服务配置了最多 10 次 HTTP 重试，不能将它理解为同步发布事务。
- `POST_DELETE` 只有文章 ID；更新可能改变 slug。因此不能仅靠新 slug 清理旧路径的缓存。

本轮已经加了标签，但**尚未创建 Next 接收接口，也未在后台登记 webhook**。目前只有时间驱动的重新验证，后台发布、编辑、隐藏或删除不会立即清理 Next 缓存。浏览器刷新也不等于清空服务端缓存。

下一小步接线方案：先实现仅服务端使用的签名校验接收接口，支持健康检查，再在既有后台配置接收地址、匹配的密钥、事件和作用域。文章事件包含 `TO_SYSTEM_VISITOR`（5）作用域，订阅不能只选管理员事件。密钥不进入 `NEXT_PUBLIC_*` 或请求日志。

| 已验证通知 | 建议清理的现有标签 |
| --- | --- |
| 文章创建、更新、删除 | `blog:posts`、`blog:categories`（列表/导航分类数量也可能变化） |
| 分类创建、更新、删除 | `blog:categories`（所有带分类名的读取已关联该标签） |
| 独立页面创建、更新、删除 | `blog:pages` |

未来接收端可对这些标签调用 `revalidateTag(tag, { expire: 0 })`，让后续服务端请求等待新结果。删除、隐藏和转私密尤其不能只依赖长期缓存；但通知本身仍有投递延迟，已打开的页面也不会被服务器主动推送刷新。实时撤回的要求需另行设计。

## 本轮检查

- 公开 DTO 字段投影、缓存标签和时间约束由 `scripts/verify-blog-cache.mjs` 检查。
- 真实本地列表和详情各首次请求 Core 一次，紧接着的重复访问未新增对应后端读取。
- 不通过修改真实文章来测试失效；没有写 webhook 配置或启动管理后台。

参考：[Next 缓存](https://nextjs.org/docs/app/getting-started/caching)、[cacheLife](https://nextjs.org/docs/app/api-reference/functions/cacheLife)、[revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)。具体 API 以项目安装版本的本地文档为准。
