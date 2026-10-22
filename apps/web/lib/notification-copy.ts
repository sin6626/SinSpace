export const notificationSettings = { timeout: 5000, limit: 3, close: "关闭" };

export const notificationCopy = {
  POST_CREATE: { title: "有新文章了", description: "博客发布了新文章，可以前往文章列表看看。" },
  POST_UPDATE: { title: "文章有更新", description: "你正在阅读的文章已修改，稍后刷新可查看最新内容。" },
  POST_DELETE: { title: "这篇文章已移除", description: "当前文章已删除，可以返回文章列表继续阅读。" },
};

export function getNotification(message: unknown) {
  if (!message || typeof message !== "object" || !("type" in message)) return null;
  switch (message.type) {
    case "POST_CREATE": {
      if (!("data" in message) || !message.data || typeof message.data !== "object") return null;
      const post = message.data;
      // Core also emits create events for unpublished posts; never announce those.
      if (!("isPublished" in post) || post.isPublished !== true) return null;
      return notificationCopy.POST_CREATE;
    }
    case "POST_UPDATE": return notificationCopy.POST_UPDATE;
    case "POST_DELETE": return notificationCopy.POST_DELETE;
    default: return null;
  }
}
